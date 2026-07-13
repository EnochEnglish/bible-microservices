/**
 * Zvec Bridge — Node.js side (plain http, no Express dependency)
 * 
 * Provides in-process vector database for the Kotlin backend.
 * Called via server.js when /zvec/* routes are hit.
 * 
 * Collections: {modelId}_{sourceType}, e.g. "tfidf_256_bible"
 */

const path = require('path');
const fs = require('fs');

// In-memory vector store
// Structure: Map<collectionName, Map<vectorId, {vector, metadata}>>
const collections = new Map();
const collectionMeta = new Map();

const DATA_DIR = path.join(__dirname, '..', 'data', 'zvec');
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}

// ─── Load from disk ───
function loadFromDisk() {
    if (!fs.existsSync(DATA_DIR)) return;
    for (const file of fs.readdirSync(DATA_DIR)) {
        if (!file.endsWith('.wal')) continue;
        const collectionName = file.replace('.wal', '');
        const data = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
        const lines = data.split('\n').filter(l => l.trim());
        
        let coll = new Map();
        for (const line of lines) {
            try {
                const entry = JSON.parse(line);
                if (entry.op === 'insert') {
                    coll.set(entry.id, { vector: entry.vector, metadata: entry.metadata });
                } else if (entry.op === 'delete') {
                    coll.delete(entry.id);
                }
            } catch (_) {}
        }
        
        if (coll.size > 0) {
            const dim = coll.values().next().value.vector.length;
            collections.set(collectionName, coll);
            collectionMeta.set(collectionName, { dimension: dim, count: coll.size });
            console.log(`[Zvec] Loaded: ${collectionName} (${coll.size} vectors, ${dim}d)`);
        }
    }
}
loadFromDisk();

// ─── Helpers ───
function ensureCollection(name, dimension) {
    if (!collections.has(name)) {
        collections.set(name, new Map());
        collectionMeta.set(name, { dimension, count: 0 });
    }
}

function appendWal(collectionName, op, id, vector, metadata) {
    try {
        fs.appendFileSync(
            path.join(DATA_DIR, `${collectionName}.wal`),
            JSON.stringify({ op, id, vector, metadata }) + '\n'
        );
    } catch (e) {
        console.warn(`[Zvec] WAL append failed:`, e.message);
    }
}

function cosineSimilarity(a, b) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? dot / denom : 0;
}

function jsonResp(rs, code, data) {
    rs.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
    rs.end(JSON.stringify(data));
}

// ─── Main handler ───
function handleZvec(url, method, body, rs) {
    // GET /zvec/status
    if (url === '/zvec/status' && method === 'GET') {
        const collInfo = {};
        for (const [name, coll] of collections) {
            collInfo[name] = { count: coll.size, dimension: collectionMeta.get(name).dimension };
        }
        return jsonResp(rs, 200, {
            available: true,
            collections: collInfo,
            totalVectors: [...collections.values()].reduce((s, c) => s + c.size, 0),
            loadedModels: []
        });
    }

    // POST /zvec/collection
    if (url === '/zvec/collection' && method === 'POST') {
        if (!body.collection || !body.dimension) return jsonResp(rs, 400, { error: 'Missing collection or dimension' });
        ensureCollection(body.collection, body.dimension);
        return jsonResp(rs, 200, { success: true, collection: body.collection, dimension: body.dimension });
    }

    // POST /zvec/insert
    if (url === '/zvec/insert' && method === 'POST') {
        const { collection, items } = body;
        if (!collection || !Array.isArray(items)) return jsonResp(rs, 400, { error: 'Missing collection or items' });
        
        if (!collections.has(collection)) {
            ensureCollection(collection, items[0]?.vector?.length || 256);
        }
        const coll = collections.get(collection);
        let inserted = 0;
        
        for (const item of items) {
            if (!item.id || !item.vector) continue;
            coll.set(item.id, { vector: item.vector, metadata: item.metadata || {} });
            appendWal(collection, 'insert', item.id, item.vector, item.metadata);
            inserted++;
        }
        
        const meta = collectionMeta.get(collection);
        if (meta) meta.count = coll.size;
        return jsonResp(rs, 200, { success: true, inserted, total: coll.size });
    }

    // POST /zvec/search
    if (url === '/zvec/search' && method === 'POST') {
        const { collection, vector, topK = 10, filters = {} } = body;
        if (!collection || !vector) return jsonResp(rs, 400, { error: 'Missing collection or vector' });
        
        const coll = collections.get(collection);
        if (!coll || coll.size === 0) return jsonResp(rs, 200, { results: [], total: 0 });
        
        const scores = [];
        for (const [id, entry] of coll) {
            let pass = true;
            for (const [k, v] of Object.entries(filters)) {
                if (entry.metadata[k] !== v) { pass = false; break; }
            }
            if (!pass) continue;
            
            scores.push({ id, score: cosineSimilarity(vector, entry.vector), metadata: entry.metadata });
        }
        
        scores.sort((a, b) => b.score - a.score);
        return jsonResp(rs, 200, { results: scores.slice(0, topK), total: scores.length });
    }

    // POST /zvec/delete
    if (url === '/zvec/delete' && method === 'POST') {
        const { collection, filters } = body;
        if (!collection) return jsonResp(rs, 400, { error: 'Missing collection' });
        
        const coll = collections.get(collection);
        if (!coll) return jsonResp(rs, 200, { deleted: 0 });
        
        let deleted = 0;
        for (const [id, entry] of [...coll]) {
            let pass = true;
            for (const [k, v] of Object.entries(filters || {})) {
                if (entry.metadata[k] !== v) { pass = false; break; }
            }
            if (pass) {
                coll.delete(id);
                appendWal(collection, 'delete', id);
                deleted++;
            }
        }
        
        const meta = collectionMeta.get(collection);
        if (meta) meta.count = coll.size;
        return jsonResp(rs, 200, { success: true, deleted, remaining: coll.size });
    }

    // GET /zvec/collection/:name/stats
    const statsMatch = url.match(/^\/zvec\/collection\/([^/]+)\/stats$/);
    if (statsMatch && method === 'GET') {
        const name = statsMatch[1];
        const coll = collections.get(name);
        if (!coll) return jsonResp(rs, 404, { error: 'Collection not found' });
        const meta = collectionMeta.get(name);
        return jsonResp(rs, 200, { collection: name, count: coll.size, dimension: meta.dimension });
    }

    // POST /zvec/flush
    if (url === '/zvec/flush' && method === 'POST') {
        return jsonResp(rs, 200, { success: true });
    }

    // POST /zvec/embed (optional — requires transformers.js)
    if (url === '/zvec/embed' && method === 'POST') {
        const { texts, model } = body;
        if (!Array.isArray(texts)) return jsonResp(rs, 400, { error: 'Missing texts' });
        
        // Check if transformers.js is available
        let pipeline;
        try { pipeline = require('@xenova/transformers').pipeline; } catch (_) {
            return jsonResp(rs, 503, { error: 'transformers.js not installed. Use TF-IDF embedding from backend.' });
        }
        
        const modelMap = {
            'bgesmall_512': 'Xenova/bge-small-zh-v1.5',
            'bgebase_768': 'Xenova/bge-base-zh-v1.5'
        };
        const modelName = modelMap[model];
        if (!modelName) return jsonResp(rs, 400, { error: `Unknown model: ${model}` });
        
        (async () => {
            try {
                const extractor = await pipeline('feature-extraction', modelName);
                const embeddings = [];
                for (const text of texts) {
                    const output = await extractor(text, { pooling: 'mean', normalize: true });
                    embeddings.push(Array.from(output.data));
                }
                jsonResp(rs, 200, { embeddings, model });
            } catch (e) {
                console.error('[Zvec] Embed failed:', e.message);
                jsonResp(rs, 500, { error: e.message });
            }
        })();
        return;
    }

    // 404
    jsonResp(rs, 404, { error: `Unknown Zvec endpoint: ${method} ${url}` });
}

module.exports = { handleZvec };
