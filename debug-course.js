// Debug: check course 7 detail and sections/lessons
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

  // List all courses
  const r1 = await apiCall('GET', '/courses');
  console.log('All courses:', r1.status);
  if (Array.isArray(r1.data)) {
    r1.data.forEach(c => console.log('  ID=' + c.id + ' title=' + c.title + ' status=' + c.status));
  }

  // Get course 7 full detail
  const r2 = await apiCall('GET', '/courses/7', null, token);
  console.log('\nCourse 7 detail:', r2.status);
  if (r2.data.course) {
    const c = r2.data.course;
    console.log('  title:', c.title);
    console.log('  sections:', c.sections ? c.sections.length : 0);
    if (c.sections) {
      c.sections.forEach(s => {
        console.log('    Section ID=' + s.id + ' title=' + s.title + ' lessons=' + (s.lessons ? s.lessons.length : (s.lessonCount || 0)));
        if (s.lessons) {
          s.lessons.forEach(l => console.log('      Lesson ID=' + l.id + ' title=' + l.title));
        }
      });
    }
  } else {
    console.log('  data:', JSON.stringify(r2.data).substring(0, 500));
  }

  // Try getting sections directly
  const r3 = await apiCall('GET', '/courses/7/sections', null, token);
  console.log('\nSections for course 7:', r3.status, JSON.stringify(r3.data).substring(0, 500));
}

main().catch(console.error);
