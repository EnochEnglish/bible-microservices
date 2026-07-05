const http = require('http');

const TOKEN = process.argv[2];
const courseId = process.argv[3] || '1';

const req = http.request({
  hostname: 'localhost', port: 8080,
  path: '/api/v1/courses/' + courseId,
  method: 'DELETE',
  headers: { 'Authorization': 'Bearer ' + TOKEN }
}, res => {
  let buf = '';
  res.on('data', d => buf += d);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', buf);
  });
});
req.on('error', e => console.error('Error:', e.message));
req.end();
