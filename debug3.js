// Raw API response check
const http = require('http');

function apiCall(method, path) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: 'localhost', port: 8080, path: '/api/v1' + path, method }, (res) => {
      let chunks = '';
      res.on('data', d => chunks += d);
      res.on('end', () => resolve({ status: res.statusCode, raw: chunks }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const r = await apiCall('GET', '/courses/7');
  console.log('Status:', r.status);
  console.log('Raw response (first 2000 chars):');
  console.log(r.raw.substring(0, 2000));
  console.log('\n... (total length:', r.raw.length, ')');
}

main().catch(console.error);
