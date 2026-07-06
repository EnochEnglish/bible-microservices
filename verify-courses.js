// Verify courses
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
  // Login
  const loginRes = await apiCall('POST', '/auth/login', { username: 'admin', password: 'admin123' });
  const token = loginRes.data.token;
  console.log('Token:', token ? 'OK' : 'FAIL');

  // List courses (no auth)
  const r1 = await apiCall('GET', '/courses');
  console.log('\nGET /courses (no auth):', r1.status, JSON.stringify(r1.data).substring(0, 200));

  // List courses (with auth)
  const r2 = await apiCall('GET', '/courses', null, token);
  console.log('\nGET /courses (with auth):', r2.status, JSON.stringify(r2.data).substring(0, 200));

  // Get course 7
  const r3 = await apiCall('GET', '/courses/7', null, token);
  console.log('\nGET /courses/7:', r3.status, JSON.stringify(r3.data).substring(0, 300));
}

main().catch(console.error);
