// Test create section endpoint directly
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

  // Try creating a section for course 7
  const secRes = await apiCall('POST', '/courses/7/sections', {
    title: '测试单元',
    titleEn: 'Test Section',
    orderIndex: 99
  }, token);
  console.log('Create section:', secRes.status, JSON.stringify(secRes.data).substring(0, 300));

  // Now check course detail
  const r = await apiCall('GET', '/courses/7', null, token);
  console.log('\nCourse 7 sections:', r.data.course ? r.data.course.sections?.length : 'no course');
  if (r.data.course?.sections) {
    r.data.course.sections.forEach(s => console.log('  Section:', s.id, s.title));
  }

  // Also check: list lessons for a known section ID
  const r2 = await apiCall('GET', '/courses/7/sections/11/lessons', null, token);
  console.log('\nLessons for section 11:', r2.status, JSON.stringify(r2.data).substring(0, 300));
}

main().catch(console.error);
