// Publish course 7 + verify
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

  // Publish course 7
  const updateRes = await apiCall('PUT', '/courses/7', {
    title: '大使命课程',
    titleEn: 'Great Commission Course',
    description: '基于马太福音28:18-20的完整门徒训练课程',
    domain: 'theology',
    category: 'discipleship',
    difficulty: 'intermediate',
    isPublished: true
  }, token);
  console.log('PUT /courses/7:', updateRes.status, JSON.stringify(updateRes.data).substring(0, 300));

  // Verify list
  const r = await apiCall('GET', '/courses');
  console.log('\nGET /courses:', r.status, 'count=' + (Array.isArray(r.data) ? r.data.length : '?'));
  if (Array.isArray(r.data)) {
    r.data.forEach(c => console.log('  ID=' + c.id + ' title=' + c.title + ' status=' + c.status));
  }
}

main().catch(console.error);
