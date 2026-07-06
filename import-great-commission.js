/**
 * 导入大使命课程 — 完整版
 * 基于马太福音28:18-20的大使命课程，涵盖门徒训练的完整体系
 */
const http = require('http');

const API = 'localhost:3000';
const ADMIN = { username: 'admin', password: 'admin123' };

function apiCall(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);

    const req = http.request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/v1' + path,
      method: method,
      headers: headers
    }, (res) => {
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
  // 1. Login as admin
  console.log('1. Logging in as admin...');
  const loginRes = await apiCall('POST', '/auth/login', ADMIN);
  if (loginRes.status !== 200) { console.error('Login failed:', loginRes); return; }
  const token = loginRes.data.token;
  console.log('   Token obtained');

  // 2. Delete old garbled courses (IDs 2, 5, 6)
  console.log('\n2. Deleting old garbled courses...');
  for (const id of [2, 5, 6]) {
    const del = await apiCall('DELETE', '/courses/' + id, null, token);
    console.log('   Delete course ' + id + ':', del.status);
  }

  // 3. Create 大使命课程
  console.log('\n3. Creating 大使命课程...');
  const courseRes = await apiCall('POST', '/courses', {
    title: '大使命课程',
    titleEn: 'Great Commission Course',
    description: '基于马太福音28:18-20的完整门徒训练课程。耶稣升天前颁布的大使命是教会存在的根本使命：去、使万民作门徒、施洗、教训他们遵守。本课程系统涵盖从决志信主到成为成熟门徒、再到参与使命的完整成长路径。',
    descriptionEn: 'A complete discipleship course based on Matthew 28:18-20. The Great Commission is the fundamental mission of the church: go, make disciples of all nations, baptize them, and teach them to obey everything Jesus commanded.',
    domain: 'theology',
    category: 'discipleship',
    difficulty: 'intermediate',
    estimatedHours: 40,
    price: 0,
    currency: 'CNY',
    status: 'published'
  }, token);

  if (courseRes.status !== 200) { console.error('Create course failed:', courseRes); return; }
  const courseId = courseRes.data.id;
  console.log('   Course created, ID:', courseId);

  // 4. Create sections and lessons
  const sections = [
    {
      title: '第一单元：大使命的呼召',
      titleEn: 'Unit 1: The Call of the Great Commission',
      lessons: [
        { title: '第1课：大使命的经文基础', titleEn: 'Lesson 1: Biblical Foundation of the Great Commission', content: '马太福音28:18-20是主耶稣升天前对门徒的最后嘱托。这段经文被称为"大使命"，是教会存在的根本原因。\n\n核心要素：\n1. 权柄："天上地下所有的权柄都赐给我了"（v18）\n2. 行动："你们要去，使万民作我的门徒"（v19）\n3. 洗礼："奉父、子、圣灵的名给他们施洗"（v19）\n4. 教导："凡我所吩咐你们的，都教训他们遵守"（v20）\n5. 同在："我就常与你们同在，直到世界的末了"（v20）\n\n大使命不是可有可无的选项，而是每个基督徒的使命。耶稣首先宣告祂的权柄——天上地下所有的权柄，然后在这个权柄的基础上颁布使命。这意味着大使命有宇宙最高权柄的支撑。\n\n思考问题：\n- 大使命中的五个要素，哪一个最触动你？\n- "使万民作门徒"对你个人意味着什么？\n- 耶稣说"我就常与你们同在"如何给你勇气去执行使命？', contentEn: 'Matthew 28:18-20 is Jesus\' final commission to His disciples before His ascension. This passage is called the "Great Commission" and is the fundamental reason for the church\'s existence.\n\nKey elements:\n1. Authority: "All authority in heaven and on earth has been given to me" (v18)\n2. Action: "Go and make disciples of all nations" (v19)\n3. Baptism: "Baptizing them in the name of the Father and of the Son and of the Holy Spirit" (v19)\n4. Teaching: "Teaching them to obey everything I have commanded you" (v20)\n5. Presence: "And surely I am with you always, to the very end of the age" (v20)' },
        { title: '第2课：大使命的圣经神学脉络', titleEn: 'Lesson 2: Biblical Theology of the Great Commission', content: '大使命不是孤立的事件，而是贯穿整本圣经的救赎主线的集中体现。\n\n创世记3:15 — 人类堕落后的第一个应许："女人的后裔要伤你的头"——上帝在审判中已经预备了救恩。\n\n创世记12:1-3 — 亚伯拉罕之约："地上的万族都要因你得福"——上帝拣选亚伯拉罕，目的是透过他的后裔赐福万国。\n\n诗篇67篇 — 使命诗篇："愿万民都称赞你"——以色列存在的目的是成为万民蒙福的管道。\n\n以赛亚书49:6 — 仆人之歌："我还要使你作外邦人的光，叫你施行我的救恩，直到地极"——上帝的救恩不限于以色列，而是扩展到全地。\n\n马太福音28:18-20 — 大使命的颁布：耶稣将旧约的使命脉络集中在一个明确的命令中。\n\n使徒行传1:8 — 使命的执行："但圣灵降临在你们身上，你们就必得着能力，并要在耶路撒冷、犹太全地，和撒玛利亚，直到地极，作我的见证。"\n\n启示录7:9 — 使命的终局："有许多的人，没有人能数过来，是从各国、各族、各民、各方来的，站在宝座和羔羊面前"——大使命最终指向的是万民敬拜的场景。\n\n思考问题：\n- 从创世记到启示录，上帝的使命脉络如何连贯？\n- 以色列作为"万民蒙福的管道"这一身份，对今天的教会有什么启示？\n- 你如何参与在这条使命脉络中？', contentEn: 'The Great Commission is not an isolated event but the culmination of the redemption thread running through the entire Bible.\n\nGenesis 3:15 - The first promise after the Fall.\nGenesis 12:1-3 - The Abrahamic Covenant.\nPsalm 67 - The Missional Psalm.\nIsaiah 49:6 - The Servant Songs.\nMatthew 28:18-20 - The Commission given.\nActs 1:8 - The Commission executed.\nRevelation 7:9 - The Commission fulfilled.' },
        { title: '第3课：大使命与上帝的属性', titleEn: 'Lesson 3: The Great Commission and God\'s Character', content: '大使命根植于上帝的属性本身。\n\n上帝的慈爱：约翰福音3:16"神爱世人，甚至将他的独生子赐给他们"——大使命的动力是上帝对世人的爱。\n\n上帝的公义：罗马书1:16-17"我不以福音为耻；这福音本是神的大能，要救一切相信的"——福音彰显上帝的公义，使人因信称义。\n\n上帝的圣洁：彼得前书1:15-16"那召你们的既是圣洁，你们在一切所行的事上也要圣洁"——大使命的目标是产生圣洁的门徒。\n\n上帝的信实：提摩太后书2:13"我们纵然失信，他仍是可信的，因为他不能背乎自己"——上帝信守祂的应许，大使命必定成就。\n\n上帝的主权：但以理书4:17"至高者在人的国中掌权"——大使命有宇宙最高权柄的保证。\n\n思考问题：\n- 上帝的哪个属性最激励你参与大使命？\n- 如果大使命只基于上帝的慈爱而没有公义，会有什么偏差？\n- 上帝的信实如何给你在传福音失败时的安慰？', contentEn: 'The Great Commission is rooted in the very character of God: His love (John 3:16), justice (Rom 1:16-17), holiness (1 Pet 1:15-16), faithfulness (2 Tim 2:13), and sovereignty (Dan 4:17).' }
      ]
    },
    {
      title: '第二单元：决志与得救',
      titleEn: 'Unit 2: Salvation and New Life',
      lessons: [
        { title: '第4课：罪与救恩', titleEn: 'Lesson 4: Sin and Salvation', content: '罗马书3:23"因为世人都犯了罪，亏缺了神的荣耀"\n\n罪的本质：\n1. 原罪——从亚当继承的罪性（罗马书5:12）\n2. 本罪——个人在思想、言语、行为上违背神的律法\n3. 罪的后果——与神隔绝、灵性死亡、永远灭亡\n\n救恩的内容：\n1. 称义——因信耶稣基督被神宣告无罪（罗马书5:1）\n2. 重生——圣灵赐予新生命（约翰福音3:3,5）\n3. 和好——与神恢复关系（罗马书5:10-11）\n4. 得儿子的名分——成为神的儿女（约翰福音1:12）\n\n救恩的唯一途径：\n- 约翰福音14:6"我就是道路、真理、生命；若不借着我，没有人能到父那里去"\n- 以弗所书2:8-9"你们得救是本乎恩，也因着信；这并不是出于自己，乃是神所赐的"\n- 罗马书10:9"你若口里认耶稣为主，心里信神叫他从死里复活，就必得救"\n\n决志祷告的要素：\n1. 承认自己是罪人\n2. 相信耶稣基督为你的罪死在十字架上并复活\n3. 接受耶稣作你的主和救主\n4. 愿意悔改离开罪恶\n\n思考问题：\n- 你是否已经清楚自己得救了？根据是什么？\n- "因信称义"中的"信"包含哪些内容？\n- 悔改在救恩中扮演什么角色？', contentEn: 'Romans 3:23 - All have sinned. Salvation includes justification, regeneration, reconciliation, and adoption. The only way is through Jesus Christ (John 14:6, Eph 2:8-9, Rom 10:9).' },
        { title: '第5课：悔改与信心', titleEn: 'Lesson 5: Repentance and Faith', content: '悔改和信心是救恩的一体两面，不可分割。\n\n悔改（Metanoia）：\n- 字义：心思意念的转变\n- 不是仅仅为罪懊悔，而是转向神\n- 包含：知罪（律法光照下认识罪）、为罪忧伤（依着神的意思忧愁）、承认罪、离弃罪、归向神\n- 路加福音15:17-18 浪子的比喻："他醒悟过来，就说：我父亲有多少的雇工，口粮有余，我倒在这里饿死吗？我要起来，到我父亲那里去"\n\n信心（Pistis）：\n- 不是头脑的认同（鬼魔也信，却是战惊——雅各书2:19）\n- 是完全的信靠和交托\n- 希伯来书11:1"信就是所望之事的实底，是未见之事的确据"\n- 包含：知道（Notitia——认识福音内容）、同意（Assensus——承认福音真实）、信靠（Fiducia——个人性地投靠基督）\n\n悔改与信心的关系：\n- 马可福音1:15"日期满了，神的国近了。你们当悔改，信福音！"\n- 悔改和信心同时发生，是同一个归正行动的两个方面\n- 没有悔改的信心是虚假的信心，没有信心的悔改是绝望的懊悔\n\n生活应用：\n- 每日悔改：约一1:9"我们若认自己的罪，神是信实的，是公义的，必要赦免我们的罪"\n- 持续信靠：箴言3:5-6"你要专心仰赖耶和华，不可倚靠自己的聪明"\n\n思考问题：\n- 你是否经历过真正的悔改？描述那次经历\n- 信心和理智是否矛盾？为什么？\n- 如何在日常生活中操练持续悔改和信靠？', contentEn: 'Repentance (metanoia) and faith (pistis) are two sides of the same coin. Mark 1:15: "Repent and believe the good news!"' },
        { title: '第6课：受洗的意义', titleEn: 'Lesson 6: The Meaning of Baptism', content: '大使命中明确包含"奉父、子、圣灵的名给他们施洗"（太28:19）。\n\n洗礼的意义：\n1. 基督的命令——耶稣自己受洗（太3:13-17），也命令门徒为人施洗\n2. 归入基督——加拉太书3:27"你们受洗归入基督的，都是披戴基督了"\n3. 与基督联合——罗马书6:3-4"岂不知我们这受洗归入基督耶稣的人，是受洗归入他的死吗？所以，我们借着洗礼归入死，和他一同埋葬，原是叫我们一举一动有新生的样式，像基督借着父的荣耀从死里复活一样"\n4. 悔改的见证——使徒行传2:38"你们各人要悔改，奉耶稣基督的名受洗，叫你们的罪得赦"\n5. 归入教会——哥林多前书12:13"我们都从一位圣灵受洗，成了一个身体"\n\n洗礼的方式：\n- 浸礼：最符合"baptizo"（浸入）的字义和罗马书6:3-4的象征意义\nn- 点水礼：在有健康或其他限制时也可接受\n- 重要的是内心归正，而非外在形式的完美\n\n洗礼的前提：\n- 相信耶稣基督为个人救主\n- 真诚悔改\n- 清楚作门徒的代价\n\n洗礼后的生活：\n- 死向罪——向罪看自己是死的（罗6:11）\n- 活向神——将自己献给神（罗6:13）\n- 在教会中成长——不再独行\n\n思考问题：\n- 你是否已经受洗？如果没有，是什么阻碍你？\n- 洗礼对你来说意味着什么？\n- 洗礼后你的生活有什么改变？', contentEn: 'Baptism: Christ\'s command (Matt 28:19), union with Christ (Rom 6:3-4), repentance witness (Acts 2:38), incorporation into the church (1 Cor 12:13).' }
      ]
    },
    {
      title: '第三单元：门徒的生命',
      titleEn: 'Unit 3: The Life of a Disciple',
      lessons: [
        { title: '第7课：读经与默想', titleEn: 'Lesson 7: Scripture Reading and Meditation', content: '诗篇1:1-2"惟喜爱耶和华的律法，昼夜思想，这人便为有福"\n\n为什么要读经：\n1. 认识神——圣经是神自我启示的记录\n2. 认识自己——神的话语如镜子照出我们的真实光景（雅1:23-25）\n3. 指引道路——"你的话是我脚前的灯，路上的光"（诗119:105）\n4. 抵挡试探——耶稣用神的话语胜过魔鬼的试探（太4:1-11）\n5. 属灵粮食——"人活着，不是单靠食物，乃是靠神口里所出的一切话"（太4:4）\n\n读经方法：\n1. 通读——按计划通读整本圣经，建立全局视野\n2. 精读——逐卷逐章深入研读，理解上下文和背景\n3. 灵修——以祷告的心态读经，聆听神对个人说话\n4. 背诵——将神的话语藏在心中（诗119:11"我将你的话藏在心里，免得我得罪你"）\n5. 默想——反复思想神的话语，让真理进入内心\n\n默想的操练：\n- 选择一段经文（不宜太长）\n- 反复阅读，留意触动你的词句\n- 问自己：这段经文告诉我关于神的什么？关于人的什么？有什么命令/应许/警告？\n- 如何应用到我的生活中？\n- 以祷告回应神\n\n读经计划建议：\n- 每天固定时间（建议早晨）\n- 从新约开始，配合诗篇和箴言\n- 使用读经计划表（如麦切恩计划）\n- 记录灵修笔记\n\n思考问题：\n- 你目前的读经习惯如何？需要怎样改进？\n- 哪一段经文曾经深刻影响过你的生命？\n- 你如何操练默想神的话语？', contentEn: 'Psalm 1:1-2. Methods: reading through, in-depth study, devotional reading, memorization, meditation. A daily habit of feeding on God\'s Word.' },
        { title: '第8课：祷告的生活', titleEn: 'Lesson 8: The Life of Prayer', content: '腓立比书4:6-7"应当一无挂虑，只要凡事借着祷告、祈求，和感谢，将你们所要的告诉神。神所赐出人意外的平安必在基督耶稣里保守你们的心怀意念"\n\n祷告的本质：\n- 与神沟通——不是单向的祈求，而是双向的交流\n- 奉耶稣的名——约翰福音14:13-14"你们奉我的名无论求什么，我必成就"\n- 靠圣灵引导——罗马书8:26-27"我们的软弱有圣灵帮助"\n\n祷告的内容（ACTS法则）：\n1. Adoration（赞美）——赞美神的属性和作为\n2. Confession（认罪）——承认自己的罪，求神赦免\n3. Thanksgiving（感恩）——为神的恩典和祝福献上感谢\n4. Supplication（祈求）——为自己和他人代求\n\n主祷文的模式（太6:9-13）：\n- "我们在天上的父"——确认关系\n- "愿人都尊你的名为圣"——赞美\n- "愿你的国降临；愿你的旨意行在地上，如同行在天上"——顺服\n- "我们日用的饮食，今日赐给我们"——信靠\n- "免我们的债，如同我们免了人的债"——赦免\n- "不叫我们遇见试探；救我们脱离凶恶"——保护\n- "因为国度、权柄、荣耀，全是你的，直到永远。阿们"——归荣耀\n\n祷告的操练：\n- 固定时间：建立每日祷告的习惯\n- 随时祷告：帖前5:17"不住地祷告"\n- 禁食祷告：在重大决定或寻求时\n- 团体祷告：太18:19"若是你们中间有两个人在地上同心合意地求什么事"\n\n祷告的障碍：\n- 罪未认清（诗66:18）\n- 不信（雅1:6-7）\n- 不按神旨意求（约一5:14）\n- 心怀二意（雅1:8）\n\n思考问题：\n- 你的祷告生活如何？什么是最大的阻碍？\n- 你是否经历过祷告蒙应允的经历？\n- 如何在忙碌的生活中保持祷告的习惯？', contentEn: 'Philippians 4:6-7. ACTS: Adoration, Confession, Thanksgiving, Supplication. The Lord\'s Prayer as a model. Daily habits, fasting, corporate prayer.' },
        { title: '第9课：教会生活与团契', titleEn: 'Lesson 9: Church Life and Fellowship', content: '希伯来书10:24-25"又要彼此相顾，激发爱心，勉励行善。你们不可停止聚会，好像那些停止惯了的人，倒要彼此劝勉"\n\n教会是什么：\n- 基督的身体——哥林多前书12:27"你们就是基督的身子，并且各自作肢体"\n- 神的家——以弗所书2:19"是与圣徒同国，是神家里的人了"\n- 圣灵的殿——哥林多前书3:16"岂不知你们是神的殿，神的灵住在你们里头吗？"\n- 基督的新妇——以弗所书5:25-27\n\n教会生活的重要方面：\n1. 主日崇拜——敬拜神、聆听圣道、圣餐纪念主\n2. 团契小组——彼此分享、互相代祷、建立深入关系\n3. 服事——运用属灵恩赐服事神和人\n4. 传福音——共同参与大使命\n5. 纪律——马太福音18:15-17 教会纪律的程序\n\n属灵恩赐：\n- 罗马书12:6-8 预言、服事、教导、劝化、施舍、治理、怜悯人\n- 哥林多前书12:8-10 智慧言语、知识言语、信心、医病、行异能、先知、辨别诸灵、说方言、翻方言\n- 以弗所书4:11 使徒、先知、传福音的、牧师和教师\n- 每个信徒都有至少一种属灵恩赐，为造就教会\n\n教会成员的承诺：\n- 定期参加崇拜和团契\n- 为教会祷告\n- 用金钱奉献支持教会\n- 运用恩赐服事\n- 顺服教会领袖（来13:17）\n- 参与教会的使命\n\n思考问题：\n- 你是否委身于一间地方教会？\n- 你知道自己的属灵恩赐是什么吗？\n- 如何在教会中建立更深的团契关系？', contentEn: 'Hebrews 10:24-25. The church as the body of Christ, God\'s household, and the temple of the Spirit. Worship, fellowship, service, evangelism, and discipline.' },
        { title: '第10课：圣餐与主日', titleEn: 'Lesson 10: The Lord\'s Supper and the Lord\'s Day', content: '圣餐：\n\n设立：哥林多前书11:23-26"我当日传给你们的，原是从主领受的，就是主耶稣被卖的那一夜，拿起饼来，祝谢了，就擘开，说：这是我的身体，为你们舍的，你们应当如此行，为的是记念我。饭后，也照样拿起杯来，说：这杯是用我的血所立的新约，你们每逢喝的时候，要如此行，为的是记念我。你们每逢吃这饼，喝这杯，是表明主的死，直等到他来。"\n\n圣餐的意义：\n1. 记念——回想基督在十字架上的牺牲\n2. 表明——公开宣告主的死\n3. 盼望——"直等到他来"\n4. 团契——与基督和信徒相交\n5. 省察——林前11:28"人应当自己省察，然后吃这饼、喝这杯"\n\n领受圣餐的态度：\n- 省察自己的罪（林前11:27-29）\n- 记念基督的牺牲\n- 感恩和敬拜\nn- 期待基督再来\n\n主日：\n\n- 启示录1:10"当主日我被圣灵感动"\n- 纪念基督复活的日子（七日的第一日）\n- 早期教会在主日聚集擘饼（徒20:7）\n- 哥林多前书16:2 在主日奉献\n\n主日的意义：\n1. 停止日常劳作，安息在神里面\n2. 聚集敬拜神\n3. 聆听神的话语\n4. 领受圣餐\n5. 团契相交\n6. 行善和服事\n\n思考问题：\n- 你如何预备自己领受圣餐？\n- 主日对你来说意味着什么？\n- 如何让主日成为真正"圣"的日子？', contentEn: 'The Lord\'s Supper: remembrance, proclamation, hope, fellowship, self-examination (1 Cor 11:23-26). The Lord\'s Day: resurrection day, worship, rest, fellowship.' }
      ]
    },
    {
      title: '第四单元：门徒的品格',
      titleEn: 'Unit 4: Character of a Disciple',
      lessons: [
        { title: '第11课：圣灵的果子', titleEn: 'Lesson 11: The Fruit of the Spirit', content: '加拉太书5:22-23"圣灵所结的果子，就是仁爱、喜乐、和平、忍耐、恩慈、良善、信实、温柔、节制。这样的事没有律法禁止。"\n\n圣灵的果子是一个整体（"果子"是单数），不是九个独立的品格，而是一个被圣灵充满的生命自然流露的九个方面。\n\n九个方面的含义：\n1. 仁爱（Agape）——无私的、牺牲的爱，不求回报\n2. 喜乐（Chara）——不是因为环境而是因为与神关系而有的深层喜乐\n3. 和平（Eirene）——与神和好带来的内心安宁\n4. 忍耐（Makrothymia）——对人的忍耐，长久受苦不报复\n5. 恩慈（Chrestotes）——对人的温和和善良\n6. 良善（Agathosyne）——主动追求对他人的益处\n7. 信实（Pistis）——可靠、忠诚、信守承诺\n8. 温柔（Prautes）——在权柄下的谦和，不是软弱\n9. 节制（Egkrateia）——管理自己的欲望和冲动\n\n如何结出圣灵的果子：\n1. 顺服圣灵——加拉太书5:16"你们当顺着圣灵而行，就不放纵肉体的情欲了"\n2. 治死肉体——加拉太书5:24"凡属基督耶稣的人，是已经把肉体连肉体的邪情私欲同钉在十字架上了"\n3. 常在基督里——约翰福音15:5"我是葡萄树，你们是枝子。常在我里面的，我也常在他里面，这人就多结果子"\n4. 修剪——约翰福音15:2"凡结果子的，他就修理干净，使枝子结果子更多"\n\n与肉体的行为对比（加5:19-21）：\n- 奸淫、污秽、邪荡、拜偶像、邪术、仇恨、争竞、忌恨、恼怒、结党、纷争、异端、嫉妒、醉酒、荒宴\n\n思考问题：\n- 九个果子中，哪一个最需要在你生命中培养？\n- 你是否经历过"修剪"的过程？描述那次经历\n- 如何在日常生活中"顺着圣灵而行"？', contentEn: 'Galatians 5:22-23. One fruit, nine aspects. Walking by the Spirit, crucifying the flesh, abiding in Christ, being pruned.' },
        { title: '第12课：胜过试探与罪', titleEn: 'Lesson 12: Overcoming Temptation and Sin', content: '哥林多前书10:13"你们所遇见的试探，无非是人所能受的。神是信实的，必不叫你们受试探过于所能受的；在受试探的时候，总要给你们开一条出路，叫你们能忍受得住。"\n\n试探的来源：\n1. 魔鬼——彼得前书5:8"务要谨守，警醒。因为你们的仇敌魔鬼，如同吼叫的狮子，遍地游行，寻找可吞吃的人"\n2. 世界——约翰一书2:16"凡世界上的事，就像肉体的情欲、眼目的情欲，并今生的骄傲"\n3. 肉体——加拉太书5:17"因为情欲和圣灵相争，圣灵和情欲相争"\n\n胜过试探的策略：\n1. 儆醒祷告——马太福音26:41"总要警醒祷告，免得入了迷惑"\n2. 用神的话语——耶稣在旷野三次引用申命记胜过魔鬼（太4:1-11）\n3. 逃避——提摩太后书2:22"你要逃避少年的私欲，同那清心祷告主的人追求公义、信德、仁爱、和平"\n4. 远离——箴言4:14-15"不可行恶人的路；不要走坏人的道。要躲避，不可经过；要转身而去"\n5. 认罪——约一1:9"我们若认自己的罪，神是信实的，是公义的，必要赦免我们的罪"\n6. 彼此认罪——雅各书5:16"所以你们要彼此认罪，互相代求，使你们可以得医治"\n7. 治死——歌罗西书3:5"所以，要治死你们在地上的肢体"\n\n面对罪的步骤：\n1. 承认——具体承认是什么罪\n2. 悔改——心意转向，决定离弃\n3. 赔偿——若伤害了他人，需赔偿\n4. 寻求 accountability——找弟兄姊妹监督\n5. 替换——用合神心意的习惯替换罪的模式\n\n思考问题：\n- 你目前面对的最大试探是什么？\n- 你有什么 accountability 的安排？\n- 如何帮助正在罪中挣扎的弟兄姊妹？', contentEn: '1 Corinthians 10:13. Sources: devil, world, flesh. Strategies: watch and pray, use Scripture, flee, avoid, confess, kill sin.' },
        { title: '第13课：金钱与奉献', titleEn: 'Lesson 13: Money and Giving', content: '马太福音6:24"一个人不能事奉两个主；不是恶这个、爱那个，就是重这个、轻那个。你们不能又事奉神，又事奉玛门"\n\n圣经的金钱观：\n1. 神是一切的主——哈该书2:8"银子是我的，金子也是我的"\n2. 我们是管家——不是拥有者，而是管理者\n3. 金钱是工具——不是目的，用于成就神的旨意\n4. 警告贪财——提摩太前书6:10"贪财是万恶之根。有人贪恋钱财，就被引诱离了真道"\n\n奉献的原则：\n1. 十一奉献——玛拉基书3:10"万军之耶和华说：你们要将当纳的十分之一全然送入仓库"\n2. 感恩奉献——在十一之外，出于感恩的乐意奉献\n3. 供应教会——加拉太书6:6"在道理上受教的，当把一切需用的供给施教的人"\n4. 帮助穷困——加拉太书2:10"只是愿意我们记念穷人"\n5. 支持宣教——腓立比书4:15-16 支持保罗宣教\n\n奉献的态度：\n- 乐意——哥林多后书9:7"各人要随本心所酌定的，不要作难，不要勉强，因为捐得乐意的人是神所喜爱的"\n- 慷慨——哥林多后书8:2"在极穷之间还格外显出他们乐捐的厚恩"\n- 先献自己——哥林多后书8:5"他们更照神的旨意先把自己献给主"\n- 恒常——哥林多前书16:2"每逢七日的第一日，各人要照自己的进项抽出来留着"\n\n管家的智慧：\n- 制定预算，合理消费\n- 避免不必要的债务（箴22:7"富户管辖穷人；欠债的是债主的仆人"）\n- 储蓄和投资（箴21:20"智慧人家中珍藏宝物膏油；愚昧人随得随吞"）\n- 遗产规划（箴13:22"善人给子孙遗留产业"）\n\n思考问题：\n- 你是否有十一奉献的习惯？\n- 金钱在你的生活中是工具还是偶像？\n- 你如何教导子女正确的金钱观？', contentEn: 'Matthew 6:24. Stewardship, tithing, generous giving, debt avoidance, budgeting. "You cannot serve both God and money."' }
      ]
    },
    {
      title: '第五单元：门徒的使命',
      titleEn: 'Unit 5: The Mission of a Disciple',
      lessons: [
        { title: '第14课：传福音的使命', titleEn: 'Lesson 14: The Mission of Evangelism', content: '罗马书10:14-15"然而，人未曾信他，怎能求他呢？未曾听见他，怎能信他呢？没有传道的，怎能听见呢？若没有奉差遣，怎能传道呢？如经上所记：报福音、传喜信的人，他们的脚踪何等佳美！"\n\n传福音的动力：\n1. 基督的爱——哥林多后书5:14-15"原来基督的爱激励我们"\n2. 神的心意——提摩太前书2:4"他愿意万人得救，明白真道"\n3. 使命感——大使命的直接命令\n4. 紧迫感——约翰福音9:4"趁着白日，我们必须做那差我来者的工；黑夜将到，就没有人能做工了"\n5. 喜乐——路加福音15:7"一个罪人悔改，在天上也要这样为他欢喜"\n\n传福音的内容（福音是什么）：\n1. 神的圣洁和公义——神是创造主和审判者\n2. 人的罪——所有人都犯了罪，与神隔绝\n3. 基督的救恩——耶稣为我们的罪死了、埋葬了、第三天复活了（林前15:3-4）\n4. 回应——悔改和相信，接受耶稣为救主和生命的主\n\n传福音的方法：\n1. 生活见证——马太福音5:16"你们的光也当这样照在人前，叫他们看见你们的好行为，便将荣耀归给你们在天上的父"\n2. 口传福音——罗马书10:17"可见信道是从听道来的，听道是从基督的话来的"\n3. 友谊布道——与未信者建立真诚友谊，在关系中分享福音\n4. 见证分享——分享自己信主的经历和神的恩典\n5. 邀请教会——邀请参加教会活动、福音聚会\n6. 文字传媒——书籍、网络、社交媒体\n\n传福音的常见障碍：\n- 害怕被拒绝——但耶稣说"凡在人面前认我的，我在我天上的父面前也必认他"（太10:32）\n- 不知如何开口——可以预备个人见证（三分钟版本）\n- 生活不一致——需要先在生活中有好的见证\n- 神学担心——不需要回答所有问题，重点是分享福音\n\n思考问题：\n- 你最近一次分享福音是什么时候？\n- 你认为传福音最大的阻碍是什么？\n- 你可以邀请谁来参加教会或团契？', contentEn: 'Romans 10:14-15. Motivation: Christ\'s love, God\'s will, urgency. Content: God\'s holiness, human sin, Christ\'s salvation, response. Methods: lifestyle, verbal, friendship, testimony, invitation, media.' },
        { title: '第15课：作门徒的代价', titleEn: 'Lesson 15: The Cost of Discipleship', content: '路加福音14:27-28"凡不背着自己十字架跟从我的，也不能作我的门徒。你们哪一个要盖一座楼，不先坐下算计花费，能盖成不能呢？"\n\n作门徒的代价：\n\n1. 放弃主权——路加福音14:33"这样，你们无论什么人，若不撇下一切所有的，就不能作我的门徒"\n   - 不是必须变卖所有，而是心中一切所有的都要交给主\n   - 主随时可以拿走任何东西\n\n2. 背十字架——路加福音9:23"若有人要跟从我，就当舍己，天天背起他的十字架来跟从我"\n   - 十字架不是一般的苦难，而是死刑刑具\n   - 背十字架意味着向自己死\n\n3. 放弃亲情——路加福音14:26"人到我这里来，若不爱我胜过爱自己的父母、妻子、儿女、弟兄、姐妹，和自己的性命，就不能作我的门徒"\n   - 不是不爱家人，而是爱基督超过一切\n   - 当家人与基督冲突时，选择基督\n\n4. 忍受逼迫——提摩太后书3:12"不但如此，凡立志在基督耶稣里敬虔度日的也都要受逼迫"\n   - 世界的系统抵挡神\n   - 逼迫可能来自家庭、社会、政府\n\n5. 失去世俗利益——腓立比书3:7-8"只是我先前以为与我有益的，我现在因基督都当作有损的。不但如此，我也将万事当作有损的，因我以认识我主基督耶稣为至宝"\n\n但代价的背后是应许：\n- 马可福音10:29-30"我为福音撇下房屋，或是弟兄、姐妹、父母、儿女、田地，没有不在今世得百倍的"\n- 永生——最大的得着\n- 教会家庭——在今世得百倍\n- 逼迫中喜乐——马太福音5:10-12"为义受逼迫的人有福了"\n\n潘霍华的话："当基督呼召一个人，祂是呼召他来赴死。"\n\n思考问题：\n- 你是否计算过作门徒的代价？\n- 你目前面临什么"十字架"？\n- 代价和得着如何平衡？', contentEn: 'Luke 14:27-33. Renouncing ownership, bearing the cross, loving Christ above family, enduring persecution. But with promises: hundredfold in this age, eternal life.' },
        { title: '第16课：大使命的终局——万民敬拜', titleEn: 'Lesson 16: The Goal of the Great Commission', content: '启示录7:9-10"此后，我观看，见有许多的人，没有人能数过来，是从各国、各族、各民、各方来的，站在宝座和羔羊面前，大声喊着说：愿救恩归与坐在宝座上我们的神，也归与羔羊！"\n\n大使命的终极目标：\n\n1. 万民敬拜——启示录7:9 大使命的终局不是教会人数增长，而是万民在宝座前敬拜神\n2. 新天新地——启示录21:1-4 神与人同住，擦去一切眼泪\n3. 神的荣耀充满全地——哈巴谷书2:14"认识耶和华荣耀的知识要充满遍地，好像水充满洋海一般"\n4. 万物复兴——使徒行传3:21"天必留他，等到万物复兴的时候"\n\n大使命与主再来：\n- 马太福音24:14"这天国的福音要传遍天下，对万民作见证，然后末期才来到"\n- 大使命的完成是主再来的前提条件之一\n- 但这不是说我们可以计算出何时完成\n- 关键是忠心而非速度\n\n今日的角色：\n\n1. 祷告——为未得之民祷告，为宣教士祷告\n2. 奉献——支持宣教机构和宣教士\n3. 差派——支持教会差派宣教士\n4. 去——短宣或长宣\n5. 本地宣教——在所在城市传福音\n6. 职场宣教——在工作中作见证\n7. 网络宣教——善用新媒体传播福音\n\n未得之民（Unreached People Groups）：\n- 全球约17,000个族群中，仍有约7,000个族群未有机会听闻福音\n- 其中多数位于10/40窗口（北纬10度到40度，从西非到东亚）\n- 这些族群需要跨文化宣教士去接触\n\n终身委身：\n- 大使命不是教会的某个部门或项目，而是整个教会的存在理由\n- 每个基督徒都被呼召参与——无论是去、差派、祷告还是支持\n- 直到见主面的日子，这个使命不会结束\n\n思考问题：\n- 大使命的终局画面如何激励你？\n- 你在哪些方面可以参与大使命？\n- 你的教会有没有明确的大使命策略？\n- 你是否愿意说"主啊，我在这里，请差遣我"（赛6:8）？', contentEn: 'Revelation 7:9-10. The goal: worship from every nation. The Great Commission and Christ\'s return (Matt 24:14). Our role: prayer, giving, sending, going, local evangelism, workplace, media. Unreached people groups. Lifetime commitment.' }
      ]
    },
    {
      title: '第六单元：考试与评估',
      titleEn: 'Unit 6: Exam and Assessment',
      lessons: [
        { title: '期末考试', titleEn: 'Final Exam', content: '大使命课程期末考试，涵盖全部16课内容。', contentEn: 'Final exam covering all 16 lessons of the Great Commission Course.' }
      ]
    }
  ];

  for (let si = 0; si < sections.length; si++) {
    const sec = sections[si];
    console.log('\n4.' + (si+1) + ' Creating section: ' + sec.title);
    
    const secRes = await apiCall('POST', '/courses/' + courseId + '/sections', {
      title: sec.title,
      titleEn: sec.titleEn || sec.title,
      orderIndex: si + 1
    }, token);
    
    if (secRes.status !== 200) { console.error('  Section create failed:', secRes); continue; }
    const sectionId = secRes.data.id;
    console.log('   Section ID:', sectionId);

    for (let li = 0; li < sec.lessons.length; li++) {
      const lesson = sec.lessons[li];
      console.log('   Creating lesson: ' + lesson.title);
      
      const lessonRes = await apiCall('POST', '/courses/' + courseId + '/sections/' + sectionId + '/lessons', {
        title: lesson.title,
        titleEn: lesson.titleEn || lesson.title,
        content: lesson.content,
        contentEn: lesson.contentEn || '',
        orderIndex: li + 1
      }, token);
      
      if (lessonRes.status !== 200) { console.error('   Lesson create failed:', lessonRes); continue; }
      console.log('   Lesson ID:', lessonRes.data.id);
    }
  }

  // 5. Create exam for the last section
  console.log('\n5. Creating final exam...');
  const lastSection = await apiCall('GET', '/courses/' + courseId, null, token);
  if (lastSection.status === 200 && lastSection.data.sections) {
    const lastSecId = lastSection.data.sections[lastSection.data.sections.length - 1].id;
    
    const examRes = await apiCall('POST', '/courses/' + courseId + '/sections/' + lastSecId + '/exams', {
      title: '大使命课程期末考试',
      titleEn: 'Great Commission Final Exam',
      description: '涵盖全部16课内容的综合考试',
      passingScore: 70
    }, token);
    
    if (examRes.status === 200) {
      console.log('   Exam created, ID:', examRes.data.id);
    } else {
      console.log('   Exam creation skipped:', examRes.status);
    }
  }

  // 6. Verify
  console.log('\n6. Verifying...');
  const verifyRes = await apiCall('GET', '/courses/' + courseId, null, token);
  if (verifyRes.status === 200) {
    const c = verifyRes.data;
    console.log('   Course:', c.title);
    console.log('   Sections:', c.sections ? c.sections.length : 0);
    if (c.sections) {
      for (const s of c.sections) {
        console.log('     -', s.title, '(lessons:', s.lessonCount || '?', ')');
      }
    }
  }

  console.log('\n✅ Done! Great Commission Course imported.');
}

main().catch(err => console.error('Error:', err));
