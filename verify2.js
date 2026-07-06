// Check course status via API
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

  // Get course 7 detail
  const r = await apiCall('GET', '/courses/7', null, token);
  if (r.data.course) {
    console.log('Course 7:', JSON.stringify(r.data.course, null, 2));
    console.log('\nSections:', r.data.course.sections ? r.data.course.sections.length : 0);
  }
  
  // Try listing with domain filter
  const r2 = await apiCall('GET', '/courses?domain=theology');
  console.log('\nList with domain=theology:', r2.status, JSON.stringify(r2.data).substring(0, 200));
  
  // Try listing all
  const r3 = await apiCall('GET', '/courses');
  console.log('\nList all:', r3.status, JSON.stringify(r3.data).substring(0, 200));
}

main().catch(console.error);
