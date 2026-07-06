// Publish course 7
const http = require('http');

function apiCall(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    const req = http.request({ hostname: 'localhost', port: 8080, path: '/api/v1' + path, method, headers }, (res) => {
      let chunks = '';
      res.on('data', d => chunks += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(chunks) }); }
        catch { resolve({ status: res.statusCode, data: chunks }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  const loginRes = await apiCall('POST', '/auth/login', { username: 'admin', password: 'admin123' });
  const token = loginRes.data.token;

  // Try PUT to update status
  const updateRes = await apiCall('PUT', '/courses/7', { status: 'published' }, token);
  console.log('PUT /courses/7:', updateRes.status, JSON.stringify(updateRes.data).substring(0, 300));

  // Verify
  const r = await apiCall('GET', '/courses');
  console.log('\nGET /courses:', r.status, JSON.stringify(r.data).substring(0, 200));
}

main().catch(console.error);
