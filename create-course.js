const http = require('http');
const TOKEN = process.argv[2];

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost', port: 8080, path: '/api/v1' + path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Authorization': 'Bearer ' + TOKEN, 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => resolve({status: res.statusCode, body: buf}));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve) => {
    http.get('http://localhost:8080/api/v1' + path, res => {
      let buf=''; res.on('data',d=>buf+=d); res.on('end',()=>resolve(buf));
    });
  });
}

(async () => {
  // Create course
  const course = await post('/courses', {
    title: '新生命课程',
    titleEn: 'New Life Course',
    description: '基础门徒训练课程，涵盖救恩、祷告、读经、教会生活等主题',
    category: 'discipleship',
    difficulty: 'beginner',
    estimatedHours: 10,
    isPublished: true
  });
  console.log('Course:', course.status, course.body);
  const c = JSON.parse(course.body);
  
  // Create section
  const sec = await post('/courses/' + c.id + '/sections', {
    title: '第一单元：救恩',
    titleEn: 'Unit 1: Salvation',
    orderIndex: 1
  });
  console.log('Section:', sec.status, sec.body);
  const s = JSON.parse(sec.body);
  
  // Create lesson
  const les = await post('/courses/' + c.id + '/sections/' + s.id + '/lessons', {
    title: '第一课：认识神',
    titleEn: 'Lesson 1: Knowing God',
    content: '<h2>认识神</h2><p>圣经告诉我们，神是创造宇宙万物的主宰。祂是圣洁、公义、慈爱的神。</p><p>通过耶稣基督，我们可以认识神，并与祂建立关系。</p><blockquote>「认识你独一的真神，并且认识你所差来的耶稣基督，这就是永生。」（约17:3）</blockquote>',
    lessonType: 'text',
    durationMinutes: 15,
    orderIndex: 1
  });
  console.log('Lesson:', les.status, les.body);
  
  // Create exam
  const exam = await post('/courses/' + c.id + '/exams', {
    title: '单元一测验',
    description: '测试你对救恩基础的理解',
    questions: JSON.stringify([
      {type:'single_choice', question:'约17:3说的「永生」是什么？', options:['永远不死','认识神和耶稣基督','上天堂','受洗'], answer:'1', score:25},
      {type:'true_false', question:'神是创造宇宙万物的主宰。', answer:'0', score:25},
      {type:'fill_blank', question:'神是___、___、___的神（填三个属性）', answer:'圣洁,公义,慈爱', score:25},
      {type:'short_answer', question:'请简述你为什么需要救恩。', score:25}
    ]),
    totalScore: 100, passingScore: 60, timeLimitMinutes: 20, maxAttempts: 3
  });
  console.log('Exam:', exam.status, exam.body);
  
  // Verify
  const all = await get('/courses');
  console.log('All courses:', all);
})();
