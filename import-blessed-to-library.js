/**
 * 从 blessed.org DOC (RTF) 文件提取纯文本并录入图书馆系统
 * 1. 提取 RTF 文本
 * 2. 按章节分割
 * 3. 生成 library-data 格式 (meta.json + chapter JSONs)
 * 4. 更新 index.json
 */
const fs = require('fs');
const path = require('path');

const SRC_BASE = 'D:\\dev\\usebible.com\\html\\blessed\\chinese\\download';
const DST_BASE = 'D:\\dev\\github\\bible-microservices\\frontend\\library-data';

// Course catalog with categories
const CATALOG = [
  // 福音
  { dir: 'badgood', files: ['bog-ch.doc', 'badgood-ch.doc', 'blaka-ch.doc'], category: '福音', icon: '✝️' },
  { dir: 'johnstudy', files: ['johnstudy-ch.doc'], category: '福音', icon: '✝️' },
  
  // 门徒训练
  { dir: 'onetoone', files: ['onetoone-ch.doc'], category: '门徒训练', icon: '👣' },
  { dir: 'newlife', files: ['newlife-ch.doc'], category: '门徒训练', icon: '👣' },
  { dir: 'newlive', files: ['newlive-ch.doc'], category: '门徒训练', icon: '👣' },
  
  // 圣徒装备
  { dir: 'equipsaints', files: ['etsbook1-ch.doc', 'etsbook2-ch.doc', 'etsbook3-ch.doc', 'etsbook4-ch.doc'], category: '圣徒装备', icon: '🛡️' },
  { dir: 'expgod', files: ['jword-ch.doc', 'murheir-ch.doc'], category: '圣徒装备', icon: '🛡️' },
  
  // 神学
  { dir: 'theology', files: ['theology-ch.doc', 'ryriedoc-ch.doc', 'windevil-ch.doc'], category: '神学', icon: '📚' },
  { dir: 'bcf', files: ['bcf-ch.doc'], category: '神学', icon: '📚' },
  
  // 圣经学习/归纳法查经
  { dir: 'bstudymet', files: ['followX-ch.doc', '1jn-ch.doc', '1thes-ch.doc', 'gifts-ch.doc', 'bstudymet-ch.doc', 'preaching-ch.doc'], category: '查经', icon: '🔍' },
  { dir: 'genstudy', files: ['genstudy-ch.doc'], category: '查经', icon: '🔍' },
  
  // 新约书卷
  { dir: 'newtest', files: ['luke-ch.doc', 'mark-ch.doc', 'acts-ch.doc', 'romans-ch.doc', '1timothy-ch.doc', 'galatian-ch.doc', 'ephetians-ch.doc', 'philippians-ch.doc', 'colossians-ch.doc', 'james-ch.doc', 'revelation-ch.doc', 'philemon-ch.doc', 'romansol-ch.doc'], category: '新约注释', icon: '📖' },
  
  // 旧约书卷
  { dir: 'oldtest', files: ['isaiah-ch.doc', 'jeremiah-ch.doc', 'ezekiel-ch.doc', 'daniel-ch.doc', 'otwenti-ch.doc', 'minprophet1-ch.doc', 'lam_miproph2-ch.doc'], category: '旧约注释', icon: '📖' },
  
  // BEE 圣经学习
  { dir: 'bee', files: ['galbee-ch.doc', 'rombee-ch.doc'], category: 'BEE课程', icon: '🐝' },
  
  // JOY 圣经研究
  { dir: 'joy', files: ['joybook1-ch.doc', 'joybook2-ch.doc', 'joybook3-ch.doc', 'joybook4-ch.doc', 'joybook5-ch.doc', 'joybook6-ch.doc', 'joybook7-ch.doc', 'joybook8-ch.doc', 'joybook10-ch.doc'], category: 'JOY研经', icon: '🌟' },
  
  // 讲道
  { dir: 'sermon1', files: ['psalm-ch.doc', 'cor-ch.doc', 'jnpreach-ch.doc', 'ashcraft-ch.doc'], category: '讲道', icon: '🎙️' },
  
  // 护教
  { dir: 'apolo', files: ['apolo-ch.doc'], category: '护教', icon: '🛡️' },
  { dir: 'heretics', files: ['heretics-ch.doc'], category: '护教', icon: '🛡️' },
  
  // 儿童教育
  { dir: 'childmin', files: ['kidteach-ch.doc', 'kidteach2-ch.doc'], category: '儿童教育', icon: '👶' },
  
  // 资源
  { dir: 'resource', files: ['yuwen-ch.doc'], category: '资源', icon: '📋' },
];

// English title mapping
const TITLE_MAP = {
  'bog-ch': { title: '福音桥', titleEn: 'Bridge of the Gospel', author: 'Blessed.org' },
  'badgood-ch': { title: '坏消息与好消息', titleEn: 'Bad News and Good News', author: 'Blessed.org' },
  'blaka-ch': { title: '黑暗中的光', titleEn: 'Light in the Darkness', author: 'Blessed.org' },
  'johnstudy-ch': { title: '约翰福音学习', titleEn: 'John Bible Study', author: 'Blessed.org' },
  'onetoone-ch': { title: '一对一门徒训练', titleEn: 'One-to-One Discipleship', author: 'Blessed.org' },
  'newlife-ch': { title: '新生命', titleEn: 'New Life', author: 'Blessed.org' },
  'newlive-ch': { title: '新生活', titleEn: 'New Living', author: 'Blessed.org' },
  'etsbook1-ch': { title: '圣徒装备（第一册）', titleEn: 'Equipping the Saints Vol.1', author: 'Blessed.org' },
  'etsbook2-ch': { title: '圣徒装备（第二册）', titleEn: 'Equipping the Saints Vol.2', author: 'Blessed.org' },
  'etsbook3-ch': { title: '圣徒装备（第三册）', titleEn: 'Equipping the Saints Vol.3', author: 'Blessed.org' },
  'etsbook4-ch': { title: '圣徒装备（第四册）', titleEn: 'Equipping the Saints Vol.4', author: 'Blessed.org' },
  'jword-ch': { title: '耶稣基督之言之行', titleEn: 'Words and Deeds of Jesus Christ', author: 'Blessed.org' },
  'murheir-ch': { title: '信徒的基业', titleEn: 'Heir of the Believer', author: 'Blessed.org' },
  'theology-ch': { title: '系统神学', titleEn: 'Systematic Theology', author: 'Blessed.org' },
  'ryriedoc-ch': { title: 'Ryrie神学摘要', titleEn: 'Ryrie Theology Summary', author: 'Charles Ryrie' },
  'windevil-ch': { title: '胜过魔鬼', titleEn: 'Winning Over the Devil', author: 'Blessed.org' },
  'bcf-ch': { title: '自我面对', titleEn: 'Self-Confrontation', author: 'BCF' },
  'followX-ch': { title: '跟随基督', titleEn: 'Following Christ', author: 'Blessed.org' },
  '1jn-ch': { title: '约翰一书归纳法查经', titleEn: '1 John Inductive Study', author: 'Blessed.org' },
  '1thes-ch': { title: '帖撒罗尼迦前书查经', titleEn: '1 Thessalonians Study', author: 'Blessed.org' },
  'gifts-ch': { title: '圣灵的恩赐', titleEn: 'Spiritual Gifts', author: 'Blessed.org' },
  'bstudymet-ch': { title: '查经方法', titleEn: 'Bible Study Methods', author: 'Blessed.org' },
  'preaching-ch': { title: '讲道学', titleEn: 'Preaching', author: 'Blessed.org' },
  'genstudy-ch': { title: '创世记研读', titleEn: 'Genesis Study', author: 'Blessed.org' },
  'luke-ch': { title: '路加福音归纳法查经', titleEn: 'Luke Inductive Study', author: 'Blessed.org' },
  'mark-ch': { title: '马可福音查经', titleEn: 'Mark Study', author: 'Blessed.org' },
  'acts-ch': { title: '使徒行传查经', titleEn: 'Acts Study', author: 'Blessed.org' },
  'romans-ch': { title: '罗马书查经', titleEn: 'Romans Study', author: 'Blessed.org' },
  '1timothy-ch': { title: '提摩太前书查经', titleEn: '1 Timothy Study', author: 'Blessed.org' },
  'galatian-ch': { title: '加拉太书查经', titleEn: 'Galatians Study', author: 'Blessed.org' },
  'ephetians-ch': { title: '以弗所书查经', titleEn: 'Ephesians Study', author: 'Blessed.org' },
  'philippians-ch': { title: '腓立比书查经', titleEn: 'Philippians Study', author: 'Blessed.org' },
  'colossians-ch': { title: '歌罗西书查经', titleEn: 'Colossians Study', author: 'Blessed.org' },
  'james-ch': { title: '雅各书查经', titleEn: 'James Study', author: 'Blessed.org' },
  'revelation-ch': { title: '启示录查经', titleEn: 'Revelation Study', author: 'Blessed.org' },
  'philemon-ch': { title: '腓利门书查经', titleEn: 'Philemon Study', author: 'Blessed.org' },
  'romansol-ch': { title: '罗马书大纲', titleEn: 'Romans Outline', author: 'Blessed.org' },
  'isaiah-ch': { title: '以赛亚书查经', titleEn: 'Isaiah Study', author: 'Blessed.org' },
  'jeremiah-ch': { title: '耶利米书查经', titleEn: 'Jeremiah Study', author: 'Blessed.org' },
  'ezekiel-ch': { title: '以西结书查经', titleEn: 'Ezekiel Study', author: 'Blessed.org' },
  'daniel-ch': { title: '但以理书查经', titleEn: 'Daniel Study', author: 'Blessed.org' },
  'otwenti-ch': { title: '旧约概览', titleEn: 'OT Survey', author: 'Blessed.org' },
  'minprophet1-ch': { title: '小先知书查经（上）', titleEn: 'Minor Prophets Study 1', author: 'Blessed.org' },
  'lam_miproph2-ch': { title: '小先知书查经（下）', titleEn: 'Minor Prophets Study 2', author: 'Blessed.org' },
  'galbee-ch': { title: 'BEE加拉太书', titleEn: 'BEE Galatians', author: 'BEE' },
  'rombee-ch': { title: 'BEE罗马书', titleEn: 'BEE Romans', author: 'BEE' },
  'joybook1-ch': { title: 'JOY研经1：认识神之路', titleEn: 'JOY Study 1: Path to Knowing God', author: 'JOY' },
  'joybook2-ch': { title: 'JOY研经2：信徒的改变', titleEn: 'JOY Study 2: Believer\'s Change', author: 'JOY' },
  'joybook3-ch': { title: 'JOY研经3：信徒的价值观', titleEn: 'JOY Study 3: Believer\'s Values', author: 'JOY' },
  'joybook4-ch': { title: 'JOY研经4：神的仆人', titleEn: 'JOY Study 4: Servant of God', author: 'JOY' },
  'joybook5-ch': { title: 'JOY研经5：合神心意', titleEn: 'JOY Study 5: After God\'s Heart', author: 'JOY' },
  'joybook6-ch': { title: 'JOY研经6：以神为中心', titleEn: 'JOY Study 6: God-Centered', author: 'JOY' },
  'joybook7-ch': { title: 'JOY研经7：作个好领袖', titleEn: 'JOY Study 7: Good Leadership', author: 'JOY' },
  'joybook8-ch': { title: 'JOY研经8：完整的门徒训练', titleEn: 'JOY Study 8: Complete Discipleship', author: 'JOY' },
  'joybook10-ch': { title: 'JOY研经10：活出神荣耀', titleEn: 'JOY Study 10: Living for God\'s Glory', author: 'JOY' },
  'psalm-ch': { title: '诗篇讲道', titleEn: 'Psalms Sermons', author: 'Blessed.org' },
  'cor-ch': { title: '哥林多前书讲道', titleEn: '1 Corinthians Sermons', author: 'Blessed.org' },
  'jnpreach-ch': { title: '约翰福音讲道', titleEn: 'John Sermons', author: 'Blessed.org' },
  'ashcraft-ch': { title: '讲道集', titleEn: 'Sermon Collection', author: 'Ashcraft' },
  'apolo-ch': { title: '护教学', titleEn: 'Apologetics', author: 'Blessed.org' },
  'heretics-ch': { title: '异端', titleEn: 'Heretics', author: 'Blessed.org' },
  'kidteach-ch': { title: '儿童教导法（上）', titleEn: 'Children Ministry Teaching 1', author: 'Blessed.org' },
  'kidteach2-ch': { title: '儿童教导法（下）', titleEn: 'Children Ministry Teaching 2', author: 'Blessed.org' },
  'yuwen-ch': { title: '四个版本的中文阅读', titleEn: 'Four Chinese Bible Versions', author: 'Blessed.org' },
};

// Simple RTF text extractor
function extractRtfText(rtfBuffer) {
  // RTF files from blessed.org are in GB2312/GBK encoding
  let text;
  try {
    text = rtfBuffer.toString('latin1');
  } catch(e) {
    text = rtfBuffer.toString('utf8');
  }
  
  // RTF uses \ as escape character
  // Extract text between RTF control words
  
  let result = '';
  let i = 0;
  let skipGroup = 0;
  let inUnicode = false;
  let unicodeChars = [];
  
  while (i < text.length) {
    const ch = text[i];
    
    if (ch === '\\') {
      // Check for RTF commands
      const nextCh = text[i+1];
      
      if (nextCh === 'u') {
        // Unicode character: \uNNNNN
        const match = text.substring(i).match(/^\\u(-?\d+)\??/);
        if (match) {
          const code = parseInt(match[1]);
          if (code < 0) {
            // Negative code = Unicode char
            const unicode = String.fromCharCode(65536 + code);
            result += unicode;
          } else {
            result += String.fromCharCode(code);
          }
          i += match[0].length;
          continue;
        }
      }
      
      if (nextCh === "'") {
        // Hex byte: \\'XX
        const match = text.substring(i).match(/^\\'([0-9a-fA-F]{2})/);
        if (match) {
          const byte = parseInt(match[1], 16);
          // Accumulate bytes for GBK decoding
          unicodeChars.push(byte);
          i += match[0].length;
          continue;
        }
      }
      
      // Skip RTF command words
      const cmdMatch = text.substring(i).match(/^\\[a-zA-Z]+(-?\d+)?\s?/);
      if (cmdMatch) {
        // Handle special commands
        const cmd = cmdMatch[0];
        if (cmd.includes('par')) {
          // Flush pending GBK bytes
          if (unicodeChars.length > 0) {
            try {
              const buf = Buffer.from(unicodeChars);
              result += buf.toString('gbk');
            } catch(e) {
              result += unicodeChars.map(b => String.fromCharCode(b)).join('');
            }
            unicodeChars = [];
          }
          result += '\n';
        }
        if (cmd.includes('tab')) {
          result += '\t';
        }
        i += cmd.length;
        continue;
      }
      
      // Skip escaped characters
      i += 2;
      continue;
    }
    
    if (ch === '{') {
      // Flush pending GBK bytes before entering a new group
      if (unicodeChars.length > 0) {
        try {
          const buf = Buffer.from(unicodeChars);
          result += buf.toString('gbk');
        } catch(e) {}
        unicodeChars = [];
      }
      skipGroup++;
      i++;
      continue;
    }
    
    if (ch === '}') {
      if (unicodeChars.length > 0) {
        try {
          const buf = Buffer.from(unicodeChars);
          result += buf.toString('gbk');
        } catch(e) {}
        unicodeChars = [];
      }
      skipGroup--;
      i++;
      continue;
    }
    
    // Regular character
    if (unicodeChars.length > 0 && ch.charCodeAt(0) < 128 && ch !== ' ' && ch !== '\n' && ch !== '\r') {
      // Flush GBK bytes
      try {
        const buf = Buffer.from(unicodeChars);
        result += buf.toString('gbk');
      } catch(e) {}
      unicodeChars = [];
    }
    
    if (ch !== '\r' && ch !== '\n' || result.endsWith('\n') === false) {
      result += ch;
    }
    
    i++;
  }
  
  // Flush remaining
  if (unicodeChars.length > 0) {
    try {
      const buf = Buffer.from(unicodeChars);
      result += buf.toString('gbk');
    } catch(e) {}
  }
  
  // Clean up
  result = result.replace(/\r\n/g, '\n');
  result = result.replace(/\n{3,}/g, '\n\n');
  result = result.trim();
  
  return result;
}

// Split text into chapters by common patterns
function splitChapters(text, bookCode) {
  // Try to split by chapter markers
  // Common patterns: 第X章, Chapter X, 一、二、三, etc.
  
  // First, try splitting by "第X课" or "第X章" or "Lesson X"
  let chapters = [];
  
  // Pattern 1: 第X课/第X章
  const lessonPattern = /第[一二三四五六七八九十百零\d]+[课章讲]/g;
  const matches = [...text.matchAll(lessonPattern)];
  
  if (matches.length > 1) {
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end = i + 1 < matches.length ? matches[i+1].index : text.length;
      const title = matches[i][0];
      const content = text.substring(start, end).trim();
      chapters.push({ title, content });
    }
    return chapters;
  }
  
  // Pattern 2: Looking for lines that start with numbers (一、二、 etc.)
  const sectionPattern = /^[一二三四五六七八九十]+[、.．]/gm;
  const sectionMatches = [...text.matchAll(sectionPattern)];
  
  if (sectionMatches.length > 2) {
    for (let i = 0; i < sectionMatches.length; i++) {
      const start = sectionMatches[i].index;
      const end = i + 1 < sectionMatches.length ? sectionMatches[i+1].index : text.length;
      const lineEnd = text.indexOf('\n', start);
      const title = text.substring(start, lineEnd > 0 ? lineEnd : start + 20).trim();
      const content = text.substring(start, end).trim();
      chapters.push({ title, content });
    }
    return chapters;
  }
  
  // Pattern 3: Split by long sections (if no chapter markers, treat whole as one chapter)
  if (text.length > 5000) {
    // Split by double newline sections
    const sections = text.split(/\n\n+/).filter(s => s.trim().length > 200);
    if (sections.length > 3) {
      // Group sections into chapters of ~2000 chars each
      let currentChapter = '';
      let chapterTitle = '前言';
      let chapterIdx = 0;
      
      for (const section of sections) {
        if (currentChapter.length > 2000) {
          chapters.push({ title: chapterTitle, content: currentChapter.trim() });
          chapterIdx++;
          chapterTitle = `第${chapterIdx + 1}部分`;
          currentChapter = '';
        }
        // Check if this section looks like a title
        if (section.length < 50 && /^第.+[课章篇部分]/.test(section.trim())) {
          chapterTitle = section.trim();
        }
        currentChapter += section + '\n\n';
      }
      if (currentChapter.trim()) {
        chapters.push({ title: chapterTitle, content: currentChapter.trim() });
      }
      return chapters;
    }
  }
  
  // Fallback: whole document as one chapter
  chapters.push({ title: '全文', content: text });
  return chapters;
}

// Process one DOC file
function processDoc(filePath, bookCode, titleInfo) {
  const buffer = fs.readFileSync(filePath);
  const text = extractRtfText(buffer);
  
  if (text.length < 100) {
    console.warn(`  WARNING: ${bookCode} extracted only ${text.length} chars`);
    return null;
  }
  
  const chapters = splitChapters(text, bookCode);
  
  // Create output directory
  const outDir = path.join(DST_BASE, bookCode);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  // Write meta.json
  const meta = {
    code: bookCode,
    title: titleInfo.title,
    titleEn: titleInfo.titleEn,
    author: titleInfo.author,
    source: 'blessed.org',
    chapters: chapters.length
  };
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
  
  // Write chapter files
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const chapterFile = {
      id: i + 1,
      title: ch.title,
      content: ch.content
    };
    fs.writeFileSync(path.join(outDir, `${i+1}.json`), JSON.stringify(chapterFile, null, 2), 'utf8');
  }
  
  return { ...meta, chapters: chapters.length, totalChars: text.length };
}

// Main
async function main() {
  console.log('=== Blessed.org DOC → Library Import ===\n');
  
  const allBooks = [];
  let totalFiles = 0;
  let totalChars = 0;
  let totalChapters = 0;
  let errors = [];
  
  for (const cat of CATALOG) {
    console.log(`\n[${cat.category}]`);
    
    for (const fileName of cat.files) {
      const filePath = path.join(SRC_BASE, cat.dir, fileName);
      const baseName = fileName.replace('.doc', '');
      const bookCode = `bl_${baseName.replace(/-/g, '_')}`;
      
      if (!fs.existsSync(filePath)) {
        console.warn(`  SKIP: ${fileName} not found`);
        errors.push(`${fileName}: file not found`);
        continue;
      }
      
      const titleInfo = TITLE_MAP[baseName] || { 
        title: baseName, 
        titleEn: baseName, 
        author: 'Blessed.org' 
      };
      
      const result = processDoc(filePath, bookCode, titleInfo);
      if (result) {
        totalFiles++;
        totalChars += result.totalChars;
        totalChapters += result.chapters;
        allBooks.push({ 
          code: bookCode, 
          title: result.title, 
          titleEn: result.titleEn, 
          author: result.author,
          category: cat.category, 
          icon: cat.icon, 
          chapters: result.chapters,
          source: 'blessed.org'
        });
        console.log(`  ✓ ${fileName} → ${bookCode}: ${result.chapters} chapters, ${result.totalChars} chars`);
      } else {
        errors.push(`${fileName}: extraction failed`);
      }
    }
  }
  
  // Merge with existing index.json
  const indexExists = fs.existsSync(path.join(DST_BASE, 'index.json'));
  let existingBooks = [];
  if (indexExists) {
    try {
      const existing = JSON.parse(fs.readFileSync(path.join(DST_BASE, 'index.json'), 'utf8'));
      existingBooks = existing.books || [];
    } catch(e) {
      console.warn('Could not read existing index.json');
    }
  }
  
  // Filter out any old blessed.org entries (prefix bl_)
  const keptBooks = existingBooks.filter(b => !b.code.startsWith('bl_'));
  const mergedBooks = [...keptBooks, ...allBooks];
  
  const index = {
    totalBooks: mergedBooks.length,
    totalChapters: mergedBooks.reduce((sum, b) => sum + b.chapters, 0),
    books: mergedBooks
  };
  
  fs.writeFileSync(path.join(DST_BASE, 'index.json'), JSON.stringify(index, null, 2), 'utf8');
  
  console.log(`\n=== Summary ===`);
  console.log(`Files processed: ${totalFiles}`);
  console.log(`Total chapters: ${totalChapters}`);
  console.log(`Total characters: ${totalChars}`);
  console.log(`Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log('Errors:', errors);
  }
  console.log(`Library total: ${mergedBooks.length} books, ${index.totalChapters} chapters`);
  console.log(`\nDone!`);
}

main().catch(console.error);
