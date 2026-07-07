/**
 * 改进的 RTF 提取器 - 使用 Node.js 正确解析 blessed.org 的 RTF/DOC 文件
 * 这些文件使用 GBK 编码的 RTF，中文以 \\'XX 形式存储
 */
const fs = require('fs');
const path = require('path');

const SRC_BASE = 'D:\\dev\\usebible.com\\html\\blessed\\chinese\\download';
const DST_BASE = 'D:\\dev\\github\\bible-microservices\\frontend\\library-data';

// Title mapping (same as before)
const TITLE_MAP = require('./import-blessed-to-library.js') ? null : null; // We'll inline

const TITLES = {
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
  'joybook1-ch': { title: 'JOY研经1：认识神之路', titleEn: 'JOY Study 1', author: 'JOY' },
  'joybook2-ch': { title: 'JOY研经2：信徒的改变', titleEn: 'JOY Study 2', author: 'JOY' },
  'joybook3-ch': { title: 'JOY研经3：信徒的价值观', titleEn: 'JOY Study 3', author: 'JOY' },
  'joybook4-ch': { title: 'JOY研经4：神的仆人', titleEn: 'JOY Study 4', author: 'JOY' },
  'joybook5-ch': { title: 'JOY研经5：合神心意', titleEn: 'JOY Study 5', author: 'JOY' },
  'joybook6-ch': { title: 'JOY研经6：以神为中心', titleEn: 'JOY Study 6', author: 'JOY' },
  'joybook7-ch': { title: 'JOY研经7：作个好领袖', titleEn: 'JOY Study 7', author: 'JOY' },
  'joybook8-ch': { title: 'JOY研经8：完整的门徒训练', titleEn: 'JOY Study 8', author: 'JOY' },
  'joybook10-ch': { title: 'JOY研经10：活出神荣耀', titleEn: 'JOY Study 10', author: 'JOY' },
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

const CATALOG = [
  { dir: 'badgood', files: ['bog-ch.doc', 'badgood-ch.doc', 'blaka-ch.doc'], category: '福音', icon: '✝️' },
  { dir: 'johnstudy', files: ['johnstudy-ch.doc'], category: '福音', icon: '✝️' },
  { dir: 'onetoone', files: ['onetoone-ch.doc'], category: '门徒训练', icon: '👣' },
  { dir: 'newlife', files: ['newlife-ch.doc'], category: '门徒训练', icon: '👣' },
  { dir: 'newlive', files: ['newlive-ch.doc'], category: '门徒训练', icon: '👣' },
  { dir: 'equipsaints', files: ['etsbook1-ch.doc', 'etsbook2-ch.doc', 'etsbook3-ch.doc', 'etsbook4-ch.doc'], category: '圣徒装备', icon: '🛡️' },
  { dir: 'expgod', files: ['jword-ch.doc', 'murheir-ch.doc'], category: '圣徒装备', icon: '🛡️' },
  { dir: 'theology', files: ['theology-ch.doc', 'ryriedoc-ch.doc', 'windevil-ch.doc'], category: '神学', icon: '📚' },
  { dir: 'bcf', files: ['bcf-ch.doc'], category: '神学', icon: '📚' },
  { dir: 'bstudymet', files: ['followX-ch.doc', '1jn-ch.doc', '1thes-ch.doc', 'gifts-ch.doc', 'bstudymet-ch.doc', 'preaching-ch.doc'], category: '查经', icon: '🔍' },
  { dir: 'genstudy', files: ['genstudy-ch.doc'], category: '查经', icon: '🔍' },
  { dir: 'newtest', files: ['luke-ch.doc', 'mark-ch.doc', 'acts-ch.doc', 'romans-ch.doc', '1timothy-ch.doc', 'galatian-ch.doc', 'ephetians-ch.doc', 'philippians-ch.doc', 'colossians-ch.doc', 'james-ch.doc', 'revelation-ch.doc', 'philemon-ch.doc', 'romansol-ch.doc'], category: '新约注释', icon: '📖' },
  { dir: 'oldtest', files: ['isaiah-ch.doc', 'jeremiah-ch.doc', 'ezekiel-ch.doc', 'daniel-ch.doc', 'otwenti-ch.doc', 'minprophet1-ch.doc', 'lam_miproph2-ch.doc'], category: '旧约注释', icon: '📖' },
  { dir: 'bee', files: ['galbee-ch.doc', 'rombee-ch.doc'], category: 'BEE课程', icon: '🐝' },
  { dir: 'joy', files: ['joybook1-ch.doc', 'joybook2-ch.doc', 'joybook3-ch.doc', 'joybook4-ch.doc', 'joybook5-ch.doc', 'joybook6-ch.doc', 'joybook7-ch.doc', 'joybook8-ch.doc', 'joybook10-ch.doc'], category: 'JOY研经', icon: '🌟' },
  { dir: 'sermon1', files: ['psalm-ch.doc', 'cor-ch.doc', 'jnpreach-ch.doc', 'ashcraft-ch.doc'], category: '讲道', icon: '🎙️' },
  { dir: 'apolo', files: ['apolo-ch.doc'], category: '护教', icon: '🛡️' },
  { dir: 'heretics', files: ['heretics-ch.doc'], category: '护教', icon: '🛡️' },
  { dir: 'childmin', files: ['kidteach-ch.doc', 'kidteach2-ch.doc'], category: '儿童教育', icon: '👶' },
  { dir: 'resource', files: ['yuwen-ch.doc'], category: '资源', icon: '📋' },
];

/**
 * 正确解析 RTF 文件
 * blessed.org 的 RTF 使用 GBK 编码，中文以 \\'XX \\ 'XX 形式存储
 * 还包含 \\uN 形式的 Unicode 字符
 */
function parseRtf(filePath) {
  // 读取为 Buffer，然后按字节处理
  const buf = fs.readFileSync(filePath);
  
  // RTF 是 ASCII 控制字符 + 十六进制字节
  // 先将 buffer 转为 latin1 字符串（保持字节值不变）
  const rtf = buf.toString('latin1');
  
  let result = '';
  let i = 0;
  let gbkBytes = []; // 积累 GBK 字节
  
  function flushGbk() {
    if (gbkBytes.length > 0) {
      const gbkBuf = Buffer.from(gbkBytes);
      try {
        // 尝试 GBK 解码 (Node.js 支持 'gbk' 如果有 iconv)
        try {
          result += gbkBuf.toString('gbk');
        } catch(e) {
          // 如果 gbk 不可用，尝试手动映射常见字符
          // 退而求其次：用 latin1 显示
          result += gbkBuf.toString('latin1');
        }
      } catch(e) {
        result += gbkBytes.map(b => String.fromCharCode(b)).join('');
      }
      gbkBytes = [];
    }
  }
  
  while (i < rtf.length) {
    const ch = rtf[i];
    
    if (ch === '\\') {
      // Flush pending GBK bytes before processing RTF command
      flushGbk();
      
      const next = rtf[i + 1];
      
      // \\uN - Unicode character
      if (next === 'u') {
        const match = rtf.substring(i).match(/^\\u(-?\d+)/);
        if (match) {
          let code = parseInt(match[1]);
          if (code < 0) code = 65536 + code;
          result += String.fromCharCode(code);
          i += match[0].length;
          // Skip optional '?' after \uN
          if (rtf[i] === '?') i++;
          continue;
        }
      }
      
      // \\'XX - Hex byte (GBK encoded)
      if (next === "'") {
        const match = rtf.substring(i).match(/^\\'([0-9a-fA-F]{2})/);
        if (match) {
          gbkBytes.push(parseInt(match[1], 16));
          i += match[0].length;
          continue;
        }
      }
      
      // RTF command words: \par, \tab, \page, etc.
      const cmdMatch = rtf.substring(i).match(/^\\([a-zA-Z]+)(-?\d*)/);
      if (cmdMatch) {
        const cmd = cmdMatch[1];
        const param = cmdMatch[2];
        
        if (cmd === 'par') result += '\n';
        else if (cmd === 'tab') result += '\t';
        else if (cmd === 'page') result += '\n\n---\n\n';
        else if (cmd === 'line') result += '\n';
        else if (cmd === 'fonttbl' || cmd === 'colortbl' || cmd === 'stylesheet' || cmd === 'info') {
          // Skip destination groups - read until matching }
          let depth = 1;
          let j = i + cmdMatch[0].length;
          while (j < rtf.length && depth > 0) {
            if (rtf[j] === '{') depth++;
            else if (rtf[j] === '}') depth--;
            j++;
          }
          i = j;
          continue;
        }
        
        i += cmdMatch[0].length;
        // Skip optional space after command
        if (rtf[i] === ' ') i++;
        continue;
      }
      
      // \\{ or \\} - escaped braces
      if (next === '{' || next === '}') {
        i += 2;
        continue;
      }
      
      // \\\\ or \\' etc
      if (next === '\\') {
        result += '\\';
        i += 2;
        continue;
      }
      
      // Unknown escape - skip
      i += 2;
      continue;
    }
    
    if (ch === '{') {
      flushGbk();
      i++;
      continue;
    }
    
    if (ch === '}') {
      flushGbk();
      i++;
      continue;
    }
    
    // Regular ASCII character
    if (gbkBytes.length > 0) {
      // If we have pending GBK bytes and hit an ASCII char, flush them
      flushGbk();
    }
    
    if (ch !== '\r' && ch !== '\n') {
      result += ch;
    } else if (ch === '\n' && !result.endsWith('\n')) {
      result += '\n';
    }
    
    i++;
  }
  
  flushGbk();
  
  // Clean up
  result = result.replace(/\r\n/g, '\n');
  result = result.replace(/\n{3,}/g, '\n\n');
  result = result.replace(/[ \t]+$/gm, '');
  result = result.trim();
  
  return result;
}

// Split into chapters
function splitChapters(text) {
  // Try multiple patterns
  
  // Pattern: 第X课/第X章/第X讲
  const matches = [...text.matchAll(/第[一二三四五六七八九十百零\d]+[课章讲篇]/g)];
  if (matches.length > 1) {
    const chapters = [];
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index;
      const end = i + 1 < matches.length ? matches[i+1].index : text.length;
      const title = matches[i][0];
      const content = text.substring(start, end).trim();
      if (content.length > 50) {
        chapters.push({ title, content });
      }
    }
    if (chapters.length > 0) return chapters;
  }
  
  // Pattern: Lesson N or Chapter N
  const engMatches = [...text.matchAll(/(?:Lesson|Chapter|第[一二三四五六七八九十\d]+课)\s*[:：.]?\s*\d*/gi)];
  if (engMatches.length > 2) {
    const chapters = [];
    for (let i = 0; i < engMatches.length; i++) {
      const start = engMatches[i].index;
      const end = i + 1 < engMatches.length ? engMatches[i+1].index : text.length;
      const title = engMatches[i][0];
      const content = text.substring(start, end).trim();
      if (content.length > 50) chapters.push({ title, content });
    }
    if (chapters.length > 0) return chapters;
  }
  
  // If text is very long, split by sections
  if (text.length > 10000) {
    // Split by double-newline sections that start with a number or heading
    const sections = text.split(/\n\n+/);
    if (sections.length > 5) {
      // Group into ~3000 char chapters
      const chapters = [];
      let current = '';
      let chTitle = '前言';
      let chNum = 0;
      
      for (const sec of sections) {
        const trimmed = sec.trim();
        if (trimmed.length < 3) continue;
        
        // Check if this section is a heading
        const isHeading = trimmed.length < 80 && /^[一二三四五六七八九十\d第]/.test(trimmed);
        
        if (isHeading && current.length > 500) {
          chapters.push({ title: chTitle, content: current.trim() });
          chNum++;
          chTitle = trimmed.split('\n')[0];
          current = '';
        }
        
        if (current.length > 3000 && !isHeading) {
          chapters.push({ title: chTitle, content: current.trim() });
          chNum++;
          chTitle = `第${chNum + 1}部分`;
          current = '';
        }
        
        current += trimmed + '\n\n';
      }
      if (current.trim()) {
        chapters.push({ title: chTitle, content: current.trim() });
      }
      return chapters;
    }
  }
  
  // Fallback: whole as one chapter
  return [{ title: '全文', content: text }];
}

function processDoc(filePath, bookCode, titleInfo, category, icon) {
  const text = parseRtf(filePath);
  
  if (text.length < 50) {
    console.warn(`  WARNING: ${bookCode} extracted only ${text.length} chars`);
    return null;
  }
  
  // Check if text has Chinese characters
  const chineseCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  if (chineseCount < 10) {
    console.warn(`  WARNING: ${bookCode} has only ${chineseCount} Chinese chars (extraction may have failed)`);
  }
  
  const chapters = splitChapters(text);
  
  const outDir = path.join(DST_BASE, bookCode);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  const meta = {
    code: bookCode,
    title: titleInfo.title,
    titleEn: titleInfo.titleEn,
    author: titleInfo.author,
    source: 'blessed.org',
    category,
    icon,
    chapters: chapters.length
  };
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
  
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    fs.writeFileSync(path.join(outDir, `${i+1}.json`), JSON.stringify({
      id: i + 1,
      title: ch.title,
      content: ch.content
    }, null, 2), 'utf8');
  }
  
  return { ...meta, totalChars: text.length, chineseChars: chineseCount };
}

// Main
function main() {
  console.log('=== Blessed.org RTF → Library Import (v2) ===\n');
  
  // Check if Node.js has GBK support
  try {
    Buffer.from([0xC4, 0xE3]).toString('gbk');
    console.log('GBK support: YES\n');
  } catch(e) {
    console.log('GBK support: NO - will install iconv-lite\n');
    // Try to use iconv-lite if available
    try {
      require('iconv-lite');
      console.log('iconv-lite available\n');
    } catch(e2) {
      console.log('iconv-lite not available, using fallback\n');
    }
  }
  
  const allBooks = [];
  let totalFiles = 0;
  let totalChars = 0;
  let totalChinese = 0;
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
      
      const titleInfo = TITLES[baseName] || { title: baseName, titleEn: baseName, author: 'Blessed.org' };
      const result = processDoc(filePath, bookCode, titleInfo, cat.category, cat.icon);
      
      if (result) {
        totalFiles++;
        totalChars += result.totalChars;
        totalChinese += result.chineseChars;
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
        console.log(`  ✓ ${fileName} → ${bookCode}: ${result.chapters}ch, ${result.totalChars}chars, ${result.chineseChars}中文`);
      } else {
        errors.push(`${fileName}: extraction failed`);
      }
    }
  }
  
  // Merge with existing index
  let existingBooks = [];
  try {
    const existing = JSON.parse(fs.readFileSync(path.join(DST_BASE, 'index.json'), 'utf8'));
    existingBooks = (existing.books || []).filter(b => !b.code.startsWith('bl_'));
  } catch(e) {}
  
  const merged = [...existingBooks, ...allBooks];
  fs.writeFileSync(path.join(DST_BASE, 'index.json'), JSON.stringify({
    totalBooks: merged.length,
    totalChapters: merged.reduce((s, b) => s + b.chapters, 0),
    books: merged
  }, null, 2), 'utf8');
  
  console.log(`\n=== Summary ===`);
  console.log(`Files: ${totalFiles}, Chars: ${totalChars}, Chinese chars: ${totalChinese}`);
  console.log(`Library: ${merged.length} books, ${merged.reduce((s,b)=>s+b.chapters,0)} chapters`);
  if (errors.length) console.log(`Errors: ${errors.length}`, errors);
}

main();
