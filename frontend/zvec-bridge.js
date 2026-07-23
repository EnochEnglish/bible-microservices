/**
 * Zvec Bridge — Node.js side (plain http, no Express dependency)
 *
 * Provides in-process vector database for the Kotlin backend.
 * Called via server.js when /zvec/* routes are hit.
 *
 * Collections: {modelId}_{sourceType}, e.g. "tfidf_256_bible"
 *
 * Persistence: Binary .bin format (fast load/save).
 * Old JSON .wal files are auto-migrated on first load.
 */

const path = require('path');
const fs = require('fs');

// ─── Transformers.js (BGE models) ───
let transformersPipeline = null;
let bgeModelLoaded = null;
const bgePipelines = {}; // modelId -> pipeline instance
const BGE_MODELS = {
    'bgesmall_512': 'Xenova/bge-small-zh-v1.5',
    'bgebase_768': 'Xenova/bge-base-zh-v1.5'
};

function isTransformersAvailable() {
    try { require('@xenova/transformers'); return true; } catch (_) { return false; }
}

async function getBgePipeline(modelId) {
    if (bgePipelines[modelId]) return bgePipelines[modelId];
    try {
        const { env, pipeline } = require('@xenova/transformers');
        env.remoteHost = 'https://hf-mirror.com/';
        env.allowRemoteModels = false;
        const modelName = BGE_MODELS[modelId];
        if (!modelName) throw new Error('Unknown model: ' + modelId);
        console.log('[Zvec] Loading BGE model:', modelName, '(local cache)...');
        const pipe = await pipeline('feature-extraction', modelName);
        bgePipelines[modelId] = pipe;
        bgeModelLoaded = modelId; // keep last loaded for compat
        console.log('[Zvec] BGE model loaded:', modelId);
        return pipe;
    } catch (e) {
        console.error('[Zvec] Failed to load BGE model:', e.message);
        throw e;
    }
}

// In-memory vector store
const collections = new Map();
const collectionMeta = new Map();

const DATA_DIR = path.join(__dirname, '..', 'data', 'zvec');
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}

// ─── Binary persistence (.bin format) ───
// Header: [4-byte magic][2-byte version][2-byte dim][4-byte count]
// Per entry: [4-byte idLen][idBytes][dim×4-byte floats][2-byte metaLen][metaJsonBytes]

const BIN_MAGIC = 0x5A564543; // "ZVEC"
const BIN_VERSION = 1;

function saveBinary(collectionName) {
    const coll = collections.get(collectionName);
    if (!coll || coll.size === 0) return;
    const meta = collectionMeta.get(collectionName);
    const dim = meta.dimension;
    const entries = [...coll.entries()];

    // Calculate buffer size
    let bufSize = 4 + 2 + 2 + 4; // header
    for (const [id, entry] of entries) {
        const idBuf = Buffer.from(id, 'utf8');
        const metaBuf = Buffer.from(JSON.stringify(entry.metadata || {}), 'utf8');
        bufSize += 4 + idBuf.length + dim * 4 + 2 + metaBuf.length;
    }

    const buf = Buffer.allocUnsafe(bufSize);
    let off = 0;
    buf.writeUInt32LE(BIN_MAGIC, off); off += 4;
    buf.writeUInt16LE(BIN_VERSION, off); off += 2;
    buf.writeUInt16LE(dim, off); off += 2;
    buf.writeUInt32LE(entries.length, off); off += 4;

    for (const [id, entry] of entries) {
        const idBuf = Buffer.from(id, 'utf8');
        buf.writeUInt32LE(idBuf.length, off); off += 4;
        idBuf.copy(buf, off); off += idBuf.length;
        for (let i = 0; i < dim; i++) {
            buf.writeFloatLE(entry.vector[i], off); off += 4;
        }
        const metaBuf = Buffer.from(JSON.stringify(entry.metadata || {}), 'utf8');
        buf.writeUInt16LE(metaBuf.length, off); off += 2;
        metaBuf.copy(buf, off); off += metaBuf.length;
    }

    const binPath = path.join(DATA_DIR, `${collectionName}.bin`);
    fs.writeFileSync(binPath, buf);
    console.log(`[Zvec] Saved ${collectionName}.bin (${(bufSize/1024/1024).toFixed(1)} MB, ${entries.length} vectors)`);
}

function loadBinary(filePath) {
    const buf = fs.readFileSync(filePath);
    let off = 0;
    const magic = buf.readUInt32LE(off); off += 4;
    if (magic !== BIN_MAGIC) throw new Error('Bad magic');
    const version = buf.readUInt16LE(off); off += 2;
    const dim = buf.readUInt16LE(off); off += 2;
    const count = buf.readUInt32LE(off); off += 4;

    const coll = new Map();
    for (let i = 0; i < count; i++) {
        const idLen = buf.readUInt32LE(off); off += 4;
        const id = buf.toString('utf8', off, off + idLen); off += idLen;
        const vector = new Array(dim);
        for (let j = 0; j < dim; j++) {
            vector[j] = buf.readFloatLE(off); off += 4;
        }
        const metaLen = buf.readUInt16LE(off); off += 2;
        const metadata = metaLen > 0 ? JSON.parse(buf.toString('utf8', off, off + metaLen)) : {};
        off += metaLen;
        coll.set(id, { vector, metadata });
    }

    return { coll, dim, count };
}

// Async version — yields to event loop every 50000 entries to avoid blocking
async function loadBinaryAsync(filePath) {
    const buf = fs.readFileSync(filePath);
    let off = 0;
    const magic = buf.readUInt32LE(off); off += 4;
    if (magic !== BIN_MAGIC) throw new Error('Bad magic');
    const version = buf.readUInt16LE(off); off += 2;
    const dim = buf.readUInt16LE(off); off += 2;
    const count = buf.readUInt32LE(off); off += 4;

    const coll = new Map();
    for (let i = 0; i < count; i++) {
        const idLen = buf.readUInt32LE(off); off += 4;
        const id = buf.toString('utf8', off, off + idLen); off += idLen;
        const vector = new Array(dim);
        for (let j = 0; j < dim; j++) {
            vector[j] = buf.readFloatLE(off); off += 4;
        }
        const metaLen = buf.readUInt16LE(off); off += 2;
        const metadata = metaLen > 0 ? JSON.parse(buf.toString('utf8', off, off + metaLen)) : {};
        off += metaLen;
        coll.set(id, { vector, metadata });

        // Yield to event loop every 50000 entries
        if (i > 0 && i % 50000 === 0) {
            await new Promise(r => setImmediate(r));
        }
    }

    return { coll, dim, count };
}

// Migrate old JSON WAL to binary format (one-time)
function migrateWalToBin() {
    if (!fs.existsSync(DATA_DIR)) return;
    const walFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.wal'));
    if (walFiles.length === 0) return;

    console.log(`[Zvec] Migrating ${walFiles.length} WAL file(s) to .bin format...`);
    for (const file of walFiles) {
        const collectionName = file.replace('.wal', '');
        const walPath = path.join(DATA_DIR, file);
        const binPath = path.join(DATA_DIR, `${collectionName}.bin`);

        if (fs.existsSync(binPath)) {
            console.log(`[Zvec] ${collectionName}.bin already exists, deleting old WAL`);
            try { fs.unlinkSync(walPath); } catch (_) {}
            continue;
        }

        const walSize = fs.statSync(walPath).size;
        console.log(`[Zvec] Migrating ${collectionName}.wal (${(walSize/1024/1024).toFixed(1)} MB) -> .bin...`);

        // For huge WAL files, read in chunks via readline
        const coll = new Map();
        let dim = 256;

        // Use readline for streaming (handles large files)
        const fileStream = fs.createReadStream(walPath, { encoding: 'utf8' });
        const rl = require('readline').createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        // Process synchronously by collecting all lines first
        // For very large files this is still memory-heavy but better than readFileSync
        let pendingResolve;
        const done = new Promise(resolve => { pendingResolve = resolve; });

        rl.on('line', (line) => {
            if (!line.trim()) return;
            try {
                const entry = JSON.parse(line);
                if (entry.op === 'insert' && entry.vector) {
                    coll.set(entry.id, { vector: entry.vector, metadata: entry.metadata || {} });
                    dim = entry.vector.length;
                }
            } catch (_) {}
        });

        rl.on('close', () => {
            if (coll.size > 0) {
                collections.set(collectionName, coll);
                collectionMeta.set(collectionName, { dimension: dim, count: coll.size });
                saveBinary(collectionName);
                console.log(`[Zvec] Migrated ${collectionName}: ${coll.size} vectors, ${dim}d`);
            }
            // Delete old WAL after successful migration
            try { fs.unlinkSync(walPath); } catch (_) {}
            pendingResolve();
        });

        // Wait for this file to finish before moving to next
        // Note: This is async but we call it in a sync context —
        // the migration will complete before HTTP requests come in
        // because we don't export handleZvec until ready.
        // For simplicity, we just let it run async and collections
        // will be populated when ready.
    }
}

// Load .bin files on startup (async, yields to event loop)
async function loadFromDisk() {
    if (!fs.existsSync(DATA_DIR)) return;

    // First try loading .bin files (fast)
    const binFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.bin'));
    if (binFiles.length > 0) {
        console.log(`[Zvec] Loading ${binFiles.length} .bin file(s)...`);
        for (const file of binFiles) {
            const collectionName = file.replace('.bin', '');
            const filePath = path.join(DATA_DIR, file);
            const fileSize = fs.statSync(filePath).size;
            console.log(`[Zvec] Loading ${collectionName}.bin (${(fileSize/1024/1024).toFixed(1)} MB)...`);
            try {
                const { coll, dim, count } = await loadBinaryAsync(filePath);
                collections.set(collectionName, coll);
                collectionMeta.set(collectionName, { dimension: dim, count });
                console.log(`[Zvec] Loaded: ${collectionName} (${count} vectors, ${dim}d)`);
            } catch (e) {
                console.error(`[Zvec] Failed to load ${file}:`, e.message);
            }
        }
    }

    // Then migrate any old WAL files (async, will populate when ready)
    const walFiles = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.wal'));
    if (walFiles.length > 0) {
        console.log(`[Zvec] Found ${walFiles.length} old WAL file(s) to migrate...`);
        migrateWalToBin();
    }
}
loadFromDisk();

// Track dirty collections for periodic save
const dirtyCollections = new Set();
setInterval(() => {
    if (dirtyCollections.size === 0) return;
    const toSave = [...dirtyCollections];
    dirtyCollections.clear();
    for (const name of toSave) {
        try { saveBinary(name); } catch (_) {}
    }
    console.log(`[Zvec] Auto-saved ${toSave.length} collection(s)`);
}, 60000);

// ─── Helpers ───
function ensureCollection(name, dimension) {
    if (!collections.has(name)) {
        collections.set(name, new Map());
        collectionMeta.set(name, { dimension, count: 0 });
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
            loadedModels: Object.keys(bgePipelines),
            transformersAvailable: isTransformersAvailable()
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
            inserted++;
        }

        dirtyCollections.add(collection);
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
                deleted++;
            }
        }

        dirtyCollections.add(collection);
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

    // POST /zvec/flush — force save all collections to disk
    if (url === '/zvec/flush' && method === 'POST') {
        let saved = 0;
        for (const [name, coll] of collections) {
            if (coll.size > 0) {
                try { saveBinary(name); saved++; } catch (_) {}
            }
        }
        dirtyCollections.clear();
        return jsonResp(rs, 200, { success: true, saved });
    }

    // POST /zvec/drop-collection — delete a collection from memory + disk
    if (url === '/zvec/drop-collection' && method === 'POST') {
        const { collection } = body;
        if (!collection) return jsonResp(rs, 400, { error: 'Missing collection' });
        collections.delete(collection);
        collectionMeta.delete(collection);
        try { fs.unlinkSync(path.join(DATA_DIR, `${collection}.bin`)); } catch (_) {}
        try { fs.unlinkSync(path.join(DATA_DIR, `${collection}.wal`)); } catch (_) {}
        console.log(`[Zvec] Dropped collection: ${collection}`);
        return jsonResp(rs, 200, { success: true, dropped: collection });
    }

    // POST /zvec/embed (requires transformers.js + BGE model)
    if (url === '/zvec/embed' && method === 'POST') {
        const { texts, model } = body;
        if (!Array.isArray(texts)) return jsonResp(rs, 400, { error: 'Missing texts' });
        if (!BGE_MODELS[model]) return jsonResp(rs, 400, { error: 'Unknown model: ' + model });

        (async () => {
            try {
                const extractor = await getBgePipeline(model);
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

// ─── Preload BGE-small model on startup (async, parallel with BIN loading) ───
// BGE-base (98MB) is lazy-loaded on first use to avoid 40s startup delay
if (isTransformersAvailable()) {
    getBgePipeline('bgesmall_512').then(() => {
        console.log('[Zvec] BGE-small model preloaded and ready');
    }).catch(e => {
        console.warn('[Zvec] BGE-small preload warning:', e.message.substring(0, 150));
    });
}

module.exports = { handleZvec };
