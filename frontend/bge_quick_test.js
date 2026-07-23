// Quick BGE local test
process.env.ORT_LOG_LEVEL = 'error';
const { env, pipeline } = require('./node_modules/@xenova/transformers');
env.allowRemoteModels = false;

(async () => {
  console.log('[BGE] Starting...');
  try {
    const t0 = Date.now();
    const extractor = await pipeline('feature-extraction', 'Xenova/bge-small-zh-v1.5');
    console.log('[BGE] Loaded in', Date.now() - t0, 'ms');
    const output = await extractor(['神爱世人'], { pooling: 'mean', normalize: true });
    console.log('[BGE] Dim:', output.dims);
    console.log('[BGE] First 3:', Array.from(output.data.slice(0, 3)));
    console.log('[BGE] OK');
  } catch (e) {
    console.error('[BGE] FAIL:', String(e));
    process.exit(1);
  }
})();
