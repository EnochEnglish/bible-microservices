// Re-import courses with correct field names and isPublished: true
const http = require('http');

function apiRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    if (token) headers['Authorization'] = 'Bearer ' + token;
    
    const req = http.request('http://localhost:8080' + path, { method, headers }, (res) => {
      let chunks = '';
      res.on('data', d => chunks += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(chunks) }); }
        catch(e) { resolve({ status: res.statusCode, data: chunks }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function main() {
  // Login
  const loginRes = await apiRequest('POST', '/api/v1/auth/login', { username: 'admin', password: 'admin123' });
  const token = loginRes.data.token;
  console.log('Logged in');
  
  // Delete courses 3 and 4 (they have wrong status=draft)
  console.log('Deleting course 3...');
  const del3 = await apiRequest('DELETE', '/api/v1/courses/3', null, token);
  console.log('  Delete 3:', del3.status);
  
  console.log('Deleting course 4...');
  const del4 = await apiRequest('DELETE', '/api/v1/courses/4', null, token);
  console.log('  Delete 4:', del4.status);
  
  // ═══════════════════════════════════════════════
  // Course 2: 基要真理 (with isPublished: true)
  // ═══════════════════════════════════════════════
  console.log('\n=== Creating Course: 基要真理 ===');
  const course2 = await apiRequest('POST', '/api/v1/courses', {
    title: '基要真理',
    description: '学习圣经的基础真理，包括圣经的来源、神的属性、三位一体等核心教义。',
    category: 'discipleship',
    difficulty: 'beginner',
    isPublished: true
  }, token);
  const c2 = course2.data;
  console.log('  Course created: ID', c2.id, 'status:', c2.status);
  const courseId2 = c2.id;
  
  // Section 1: 圣经基础
  console.log('  Creating Section 1: 圣经基础');
  const s2_1 = await apiRequest('POST', '/api/v1/courses/' + courseId2 + '/sections', {
    title: '圣经基础',
    orderIndex: 1
  }, token);
  const sectionId2_1 = s2_1.data.id;
  console.log('    Section ID:', sectionId2_1);
  
  console.log('    Creating Lesson 1: 圣经的来源与权威');
  await apiRequest('POST', '/api/v1/courses/' + courseId2 + '/sections/' + sectionId2_1 + '/lessons', {
    title: '圣经的来源与权威',
    lessonType: 'text',
    content: '圣经是神所默示的，由四十多位作者历时一千五百多年写成。圣经共有66卷，分为旧约39卷和新约27卷。圣经是基督徒信仰与生活的最高权威。',
    durationMinutes: 15,
    orderIndex: 1
  }, token);
  
  console.log('    Creating Lesson 2: 如何读圣经');
  await apiRequest('POST', '/api/v1/courses/' + courseId2 + '/sections/' + sectionId2_1 + '/lessons', {
    title: '如何读圣经',
    lessonType: 'text',
    content: '读圣经需要祷告、顺服、定期、系统地阅读。建议从新约约翰福音开始，每天阅读1-2章，并结合祷告和默想。',
    durationMinutes: 15,
    orderIndex: 2
  }, token);
  
  // Section 2: 神论
  console.log('  Creating Section 2: 神论');
  const s2_2 = await apiRequest('POST', '/api/v1/courses/' + courseId2 + '/sections', {
    title: '神论',
    orderIndex: 2
  }, token);
  const sectionId2_2 = s2_2.data.id;
  console.log('    Section ID:', sectionId2_2);
  
  console.log('    Creating Lesson 1: 神的属性');
  await apiRequest('POST', '/api/v1/courses/' + courseId2 + '/sections/' + sectionId2_2 + '/lessons', {
    title: '神的属性',
    lessonType: 'text',
    content: '神是灵，是自有永有的。神是圣洁、公义、慈爱、信实的。神是全知、全能、全在的。神的属性可以分为可传递的属性和不可传递的属性。',
    durationMinutes: 15,
    orderIndex: 1
  }, token);
  
  console.log('    Creating Lesson 2: 三位一体');
  await apiRequest('POST', '/api/v1/courses/' + courseId2 + '/sections/' + sectionId2_2 + '/lessons', {
    title: '三位一体',
    lessonType: 'text',
    content: '三位一体是基督教核心教义：神只有一个本体，但包含三个位格——圣父、圣子、圣灵。三个位格同等、同荣、同质，但各有不同的角色。',
    durationMinutes: 15,
    orderIndex: 2
  }, token);
  
  // Exam
  console.log('  Creating Exam: 基要真理测验');
  const exam1Q = [
    { type: 'single_choice', question: '圣经共有多少卷？', options: ['66','27','39','73'], correctAnswer: 0, score: 25 },
    { type: 'true_false', question: '神是三位一体的。', correctAnswer: 0, score: 25 },
    { type: 'fill_blank', question: '圣父、___、圣灵', correctAnswer: '圣子', score: 25 },
    { type: 'short_answer', question: '请简述圣经对你个人的意义。', score: 25 }
  ];
  const exam1 = await apiRequest('POST', '/api/v1/courses/' + courseId2 + '/exams', {
    title: '基要真理测验',
    questions: JSON.stringify(exam1Q),
    passingScore: 60,
    totalScore: 100,
    examType: 'quiz'
  }, token);
  console.log('    Exam created:', exam1.status, 'ID:', exam1.data.id);
  
  // ═══════════════════════════════════════════════
  // Course 3: 祷告生活 (with isPublished: true)
  // ═══════════════════════════════════════════════
  console.log('\n=== Creating Course: 祷告生活 ===');
  const course3 = await apiRequest('POST', '/api/v1/courses', {
    title: '祷告生活',
    description: '学习祷告的基础与实践，建立每日与神交通的生活。',
    category: 'discipleship',
    difficulty: 'beginner',
    isPublished: true
  }, token);
  const c3 = course3.data;
  console.log('  Course created: ID', c3.id, 'status:', c3.status);
  const courseId3 = c3.id;
  
  // Section 1: 祷告的基础
  console.log('  Creating Section 1: 祷告的基础');
  const s3_1 = await apiRequest('POST', '/api/v1/courses/' + courseId3 + '/sections', {
    title: '祷告的基础',
    orderIndex: 1
  }, token);
  const sectionId3_1 = s3_1.data.id;
  console.log('    Section ID:', sectionId3_1);
  
  console.log('    Creating Lesson 1: 什么是祷告');
  await apiRequest('POST', '/api/v1/courses/' + courseId3 + '/sections/' + sectionId3_1 + '/lessons', {
    title: '什么是祷告',
    lessonType: 'text',
    content: '祷告是神的儿女与天父交通的途径。祷告不是改变神的心意，而是寻求并顺服神的旨意。祷告包括赞美、感恩、认罪、祈求。',
    durationMinutes: 10,
    orderIndex: 1
  }, token);
  
  console.log('    Creating Lesson 2: 主祷文解析');
  await apiRequest('POST', '/api/v1/courses/' + courseId3 + '/sections/' + sectionId3_1 + '/lessons', {
    title: '主祷文解析',
    lessonType: 'text',
    content: '主祷文（马太福音6:9-13）是耶稣教导门徒的祷告模范。"我们在天上的父，愿人都尊你的名为圣。愿你的国降临。愿你的旨意行在地上，如同行在天上..."',
    durationMinutes: 15,
    orderIndex: 2
  }, token);
  
  // Section 2: 祷告的实践
  console.log('  Creating Section 2: 祷告的实践');
  const s3_2 = await apiRequest('POST', '/api/v1/courses/' + courseId3 + '/sections', {
    title: '祷告的实践',
    orderIndex: 2
  }, token);
  const sectionId3_2 = s3_2.data.id;
  console.log('    Section ID:', sectionId3_2);
  
  console.log('    Creating Lesson 1: 如何建立每日祷告生活');
  await apiRequest('POST', '/api/v1/courses/' + courseId3 + '/sections/' + sectionId3_2 + '/lessons', {
    title: '如何建立每日祷告生活',
    lessonType: 'text',
    content: '建立每日祷告生活需要：1）固定时间与地点；2）从读经开始；3）写祷告日记；4）与同伴一起祷告；5）持之以恒。',
    durationMinutes: 10,
    orderIndex: 1
  }, token);
  
  console.log('    Creating Lesson 2: 祷告的阻碍');
  await apiRequest('POST', '/api/v1/courses/' + courseId3 + '/sections/' + sectionId3_2 + '/lessons', {
    title: '祷告的阻碍',
    lessonType: 'text',
    content: '祷告的常见阻碍包括：未认的罪、不信的恶心、不按神旨意求、关系的破裂、分心的事务。要克服这些阻碍，需要常常省察自己，保持与神和与人的和睦关系。',
    durationMinutes: 10,
    orderIndex: 2
  }, token);
  
  // Exam
  console.log('  Creating Exam: 祷告生活测验');
  const exam2Q = [
    { type: 'single_choice', question: '主祷文中"我们在天上的父"下一句是？', options: ['愿人都尊你的名为圣','愿你的国降临','愿你的旨意行在地上','赐给我们日用的饮食'], correctAnswer: 0, score: 50 },
    { type: 'short_answer', question: '分享你目前的祷告生活状况和想改善的地方。', score: 50 }
  ];
  const exam2 = await apiRequest('POST', '/api/v1/courses/' + courseId3 + '/exams', {
    title: '祷告生活测验',
    questions: JSON.stringify(exam2Q),
    passingScore: 60,
    totalScore: 100,
    examType: 'quiz'
  }, token);
  console.log('    Exam created:', exam2.status, 'ID:', exam2.data.id);
  
  // Verify
  console.log('\n=== Verification ===');
  const all = await apiRequest('GET', '/api/v1/courses', null, token);
  if (Array.isArray(all.data)) {
    all.data.forEach(c => console.log('  Course ID:', c.id, 'title:', c.title, 'status:', c.status));
  }
  
  console.log('\nDone!');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
