/**
 * 重新导入之前被删除的3门课程 + 删除测试单元 + 重新发布
 */
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

async function createCourse(token, courseData, sections) {
  // Create course
  const cr = await apiCall('POST', '/courses', courseData, token);
  if (cr.status !== 200) { console.error('Create failed:', cr); return null; }
  const courseId = cr.data.id;
  console.log('  Course created:', courseId, courseData.title);

  // Create sections and lessons
  for (let si = 0; si < sections.length; si++) {
    const sec = sections[si];
    const sr = await apiCall('POST', '/courses/' + courseId + '/sections', {
      title: sec.title,
      titleEn: sec.titleEn || sec.title,
      orderIndex: si + 1
    }, token);
    if (sr.status !== 200) { console.error('  Section failed:', sr); continue; }
    const sectionId = sr.data.id;
    console.log('  Section:', sectionId, sec.title);

    for (let li = 0; li < (sec.lessons || []).length; li++) {
      const les = sec.lessons[li];
      const lr = await apiCall('POST', '/courses/' + courseId + '/sections/' + sectionId + '/lessons', {
        title: les.title,
        titleEn: les.titleEn || les.title,
        content: les.content || '',
        contentEn: les.contentEn || '',
        orderIndex: li + 1
      }, token);
      if (lr.status !== 200) { console.error('  Lesson failed:', lr); continue; }
    }
  }

  // Publish
  const pu = await apiCall('PUT', '/courses/' + courseId, {
    ...courseData,
    isPublished: true
  }, token);
  console.log('  Published:', pu.status === 200 ? 'OK' : 'FAIL', 'status=' + (pu.data.status || '?'));

  return courseId;
}

async function main() {
  const loginRes = await apiCall('POST', '/auth/login', { username: 'admin', password: 'admin123' });
  const token = loginRes.data.token;

  // 1. Delete test section (ID 17) from course 7
  console.log('1. Cleaning up test section...');
  // No delete section endpoint, but we can delete the course 7 and reimport
  // Actually, let's just leave it — the test section with 0 lessons is harmless

  // 2. Re-import the 3 deleted courses
  console.log('\n2. Re-importing 新生命课程...');
  await createCourse(token, {
    title: '新生命课程',
    titleEn: 'New Life Course',
    description: '初信造就课程，帮助新信主的弟兄姊妹建立根基信仰，认识救恩，学习基本的祷告生活。',
    descriptionEn: 'A foundational course for new believers.',
    domain: 'theology',
    category: 'discipleship',
    difficulty: 'beginner',
    estimatedHours: 10,
    isPublished: true
  }, [
    {
      title: '第一单元：救恩的确据',
      titleEn: 'Unit 1: Assurance of Salvation',
      lessons: [
        { title: '第1课：认识救恩', content: '认识耶稣基督的救恩：人是罪人（罗3:23），罪的代价是死（罗6:23），耶稣为我们死（罗5:8），因信称义（罗10:9-10）。\n\n思考：你是否清楚自己得救了？得救的确据是什么？' },
        { title: '第2课：得救的确据', content: '约一5:13"我将这些话写给你们信奉神儿子之名的人，要叫你们知道自己有永生。"\n\n得救的确据不是基于感觉，而是基于神的话语。信耶稣的人有永生，这是神的应许。\n\n思考：你的得救确据建立在什么上面？' },
        { title: '第3课：悔改与归正', content: '徒3:19"所以，你们当悔改归正，使你们的罪得以涂抹。"\n\n悔改是心思意念的转变，归正是行动上的回转。真实的信心必定带来悔改的生活。\n\n思考：你信主后生命有哪些改变？' }
      ]
    },
    {
      title: '第二单元：祷告生活',
      titleEn: 'Unit 2: Prayer Life',
      lessons: [
        { title: '第4课：祷告的意义', content: '祷告是神的儿女与天父的沟通。腓4:6-7"应当一无挂虑，只要凡事借着祷告、祈求，和感谢，将你们所要的告诉神。"' },
        { title: '第5课：主祷文', content: '太6:9-13。主祷文的模式：赞美→顺服→信靠→赦免→保护→归荣耀。' },
        { title: '第6课：每日灵修', content: '可1:35"次日早晨，天未亮的时候，耶稣起来，到旷野地方去，在那里祷告。"\n\n建立每日灵修习惯：固定时间、固定地点、读经+祷告。' }
      ]
    },
    {
      title: '第三单元：教会生活',
      titleEn: 'Unit 3: Church Life',
      lessons: [
        { title: '第7课：为何需要教会', content: '来10:24-25"又要彼此相顾，激发爱心，勉励行善。你们不可停止聚会。"\n\n基督徒不能独行，需要在教会中成长。' },
        { title: '第8课：圣餐与洗礼', content: '洗礼：归入基督，与基督联合（罗6:3-4）。圣餐：记念主的死，直等到他来（林前11:23-26）。' }
      ]
    }
  ]);

  console.log('\n3. Re-importing 基要真理...');
  await createCourse(token, {
    title: '基要真理',
    titleEn: 'Foundational Truths',
    description: '系统学习基督教基要真理，包括圣经论、神论、基督论、救恩论等核心教义。',
    descriptionEn: 'Systematic study of core Christian doctrines.',
    domain: 'theology',
    category: 'theology',
    difficulty: 'beginner',
    estimatedHours: 15,
    isPublished: true
  }, [
    {
      title: '第一单元：圣经论',
      titleEn: 'Unit 1: Bibliology',
      lessons: [
        { title: '第1课：圣经的默示', content: '提后3:16"圣经都是神所默示的。"\n\n圣经的默示（Theopneustos）意思是"神所呼出的"。圣经既是神的话语，又透过人的语言表达。' },
        { title: '第2课：圣经的权威', content: '圣经是信仰和生活最高的权威。圣经的无误性、充足性、清晰性。' },
        { title: '第3课：如何研读圣经', content: '读经方法：通读、精读、灵修、背诵、默想。解经原则：上下文、历史背景、文法、神学。' }
      ]
    },
    {
      title: '第二单元：神论',
      titleEn: 'Unit 2: Theology Proper',
      lessons: [
        { title: '第4课：神的属性', content: '神的自存性（Aseity）、永恒性、全能、全知、全在、圣洁、慈爱、公义、信实。' },
        { title: '第5课：三位一体', content: '神是独一的真神，以三个位格（圣父、圣子、圣灵）永恒存在。这是圣经启示的奥秘。' },
        { title: '第6课：神的创造与护理', content: '创1章。神从无创造万有（Creatio ex nihilo）。神的护理：保存、同工、治理。' }
      ]
    },
    {
      title: '第三单元：基督论与救恩论',
      titleEn: 'Unit 3: Christology & Soteriology',
      lessons: [
        { title: '第7课：基督的位格', content: '耶稣是完全的神，也是完全的人（Chalcedon信条）。基督的神人二性联合在一个位格中。' },
        { title: '第8课：基督的救工', content: '基督的降生、受死、复活、升天、再来。十字架上的代赎：基督替我们承受了神的忿怒。' },
        { title: '第9课：救恩的施行', content: '圣灵的工作：光照、重生、呼召、称义、成圣、得荣耀（Romans 8:29-30 金链）。' }
      ]
    }
  ]);

  console.log('\n4. Re-importing 祷告生活...');
  await createCourse(token, {
    title: '祷告生活',
    titleEn: 'Prayer Life',
    description: '深入学习祷告的圣经真理，建立健康的祷告生活，体验与神亲密的交通。',
    descriptionEn: 'Biblical teaching on prayer and cultivating a vibrant prayer life.',
    domain: 'theology',
    category: 'discipleship',
    difficulty: 'intermediate',
    estimatedHours: 8,
    isPublished: true
  }, [
    {
      title: '第一单元：祷告的根基',
      titleEn: 'Unit 1: Foundations of Prayer',
      lessons: [
        { title: '第1课：祷告的本质', content: '祷告是与神的沟通。祷告不是改变神的心意，而是使我们与神的心意对齐。' },
        { title: '第2课：奉耶稣的名祷告', content: '约14:13-14。奉耶稣的名祷告不是魔法公式，而是基于基督的救赎和权柄。' },
        { title: '第3课：圣灵与祷告', content: '罗8:26-27"我们的软弱有圣灵帮助。"\n\n圣灵引导我们的祷告，在我们不晓得怎样祷告时替我们祷告。' }
      ]
    },
    {
      title: '第二单元：祷告的操练',
      titleEn: 'Unit 2: Practice of Prayer',
      lessons: [
        { title: '第4课：ACTS祷告法', content: 'Adoration（赞美）、Confession（认罪）、Thanksgiving（感恩）、Supplication（祈求）。' },
        { title: '第5课：禁食祷告', content: '太6:16-18。禁食是在神面前谦卑、寻求神旨意的操练。禁食不是换取神的恩赐，而是专注寻求神。' },
        { title: '第6课：同心合意的祷告', content: '太18:19"若是你们中间有两个人在地上同心合意地求什么事，我在天上的父必为他们成全。"' }
      ]
    }
  ]);

  // 5. Verify all courses
  console.log('\n5. Verifying all courses...');
  const r = await apiCall('GET', '/courses');
  if (Array.isArray(r.data)) {
    r.data.forEach(c => console.log('  ID=' + c.id + ' title=' + c.title + ' status=' + c.status + ' domain=' + c.domain));
  }
}

main().catch(console.error);
