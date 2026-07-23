// Test BGE model via hf-mirror.com (Chinese mirror)
const { env, pipeline } = require('./node_modules/@xenova/transformers');

async function main() {
  // Override the remote host BEFORE any pipeline call
  env.remoteHost = 'https://hf-mirror.com/';
  console.log('[test_bge] remoteHost =', env.remoteHost);

  const t0 = Date.now();
  try {
    const extractor = await pipeline('feature-extraction', 'Xenova/bge-small-zh-v1.5', {
      progress_callback: (p) => {
        if (p.status === 'downloading') {
          // Only log every 10%
          if (Math.floor(p.progress * 100) % 10 === 0) {
            process.stdout.write(`\r  Downloading... ${Math.floor(p.progress * 100)}%`);
          }
        }
      }
    });
    console.log('\r[test_bge] Loaded in', Date.now() - t0, 'ms');

    const t1 = Date.now();
    const output = await extractor('神爱世人', { pooling: 'mean', normalize: true });
    console.log('[test_bge] Embedding in', Date.now() - t1, 'ms');
    console.log('[test_bge] Dim:', output.data.length);
    console.log('[test_bge] First 5:', Array.from(output.data.slice(0, 5)));
    console.log('[test_bge] SUCCESS');
  } catch(e) {
    console.error('[test_bge] FAIL:', e.message.substring(0, 500));
    process.exit(1);
  }
}
main();
