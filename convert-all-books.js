/**
 * Batch converter — converts all local HTML books to static JSON format
 * for the library page. Reads HTML files (UTF-8 BOM or GB18030), extracts
 * title and body content, outputs meta.json + {id}.json per book.
 *
 * Usage: node convert-all-books.js
 */
const fs = require('fs');
const path = require('path');

const SRC_BASE = 'D:\\dev\\usebible.com\\html';
const OUT_BASE = path.join(__dirname, 'frontend', 'library-data');

// ─── Book registry ───
const BOOKS = [
  // 解经
  { src: 'bible_wenti', code: 'bible_wenti', title: '圣经问题解答', titleEn: 'Bible Q&A', author: '陈终道', category: '解经问题', icon: '❓', skip: true }, // already done
  { src: 'dsz', code: 'dsz', title: '圣经中的得胜者', titleEn: 'Victors in the Bible', author: '佚名', category: '解经问题', icon: '📖' },
  
  // 讲道
  { src: 'deshen', code: 'deshen', title: '讲道集', titleEn: 'Sermons', author: '佚名', category: '讲道', icon: '🎤' },
  
  // 灵修
  { src: 'devotion\\jabez', code: 'jabez', title: '雅比斯的祷告', titleEn: 'Prayer of Jabez', author: '魏肯生', category: '灵修', icon: '🙏' },
  { src: 'devotion\\listening', code: 'listening', title: '倾听恩主的声音', titleEn: 'Listening to the Lord', author: '佚名', category: '灵修', icon: '👂' },
  { src: 'devotion\\walk_with_Lord', code: 'walk_with_lord', title: '每日与主同行', titleEn: 'Walking with the Lord Daily', author: '佚名', category: '灵修', icon: '🚶' },
  { src: 'devotion\\quanwei', code: 'quanwei', title: '劝慰之言', titleEn: 'Words of Comfort', author: '佚名', category: '灵修', icon: '💬' },
  { src: 'devotion\\ptsdmm', code: 'ptsdmm', title: '葡萄树的秘密', titleEn: 'Secret of the Vine', author: '佚名', category: '灵修', icon: '🍇' },
  { src: 'classic\\hmgq', code: 'hmgq', title: '荒漠甘泉', titleEn: 'Streams in the Desert', author: '考门夫人', category: '灵修', icon: '🏜️' },
  { src: 'classic\\victoryLife\\jianti', code: 'victory_life', title: '胜利生活的秘诀', titleEn: 'Secret of Victorious Living', author: '佚名', category: '灵修', icon: '🏆' },
  
  // 经典
  { src: 'classic\\tongzai', code: 'tongzai', title: '与神同在', titleEn: 'Practice of the Presence of God (CN)', author: '劳伦斯弟兄', category: '经典著作', icon: '⛪' },
  { src: 'classic\\kneeling', code: 'kneeling', title: '跪着的基督徒', titleEn: 'The Kneeling Christian', author: '佚名', category: '经典著作', icon: '🧎' },
  { src: 'classic\\martyr-ch', code: 'martyr_ch', title: '殉道史', titleEn: 'Book of Martyrs (CN)', author: '福克斯', category: '经典著作', icon: '✝️' },
  { src: 'classic\\martyrs', code: 'martyrs', title: "Fox's Book of Martyrs", titleEn: "Fox's Book of Martyrs", author: 'John Foxe', category: '经典著作', icon: '✝️' },
  
  // 神学
  { src: 'classic\\divinity\\xtsx-j', code: 'xtsx', title: '系统神学', titleEn: 'Systematic Theology', author: '佚名', category: '神学', icon: '📚' },
  
  // 家庭
  { src: 'family\\aizhiyu', code: 'aizhiyu', title: '爱之语', titleEn: 'The Five Love Languages', author: '盖瑞·巧门', category: '家庭婚姻', icon: '❤️' },
  { src: 'family\\bless_children', code: 'bless_children', title: '蒙福的儿女', titleEn: 'Blessed Children', author: '佚名', category: '家庭婚姻', icon: '👶' },
  { src: 'family\\ccdsm', code: 'ccdsm', title: '传承的生命', titleEn: 'Life of Heritage', author: '佚名', category: '家庭婚姻', icon: '🌱' },
  { src: 'family\\clsks', code: 'clsks', title: '从零岁开始', titleEn: 'From Zero', author: '佚名', category: '家庭婚姻', icon: '🍼' },
  { src: 'family\\flower', code: 'flower', title: '花篮缘', titleEn: 'Flower Basket Story', author: '佚名', category: '家庭婚姻', icon: '🌸' },
  { src: 'family\\gshznzb', code: 'gshznzb', title: '告诉孩子，你真棒！', titleEn: 'Tell Your Child: You Are Great!', author: '卢勤', category: '家庭婚姻', icon: '👍' },
  { src: 'family\\hywtjd', code: 'hywtjd', title: '婚姻问题解答', titleEn: 'Marriage Q&A', author: '佚名', category: '家庭婚姻', icon: '💍' },
  { src: 'family\\keys', code: 'keys', title: '开启幸福婚姻的钥匙', titleEn: 'Keys to Happy Marriage', author: '佚名', category: '家庭婚姻', icon: '🔑' },
  { src: 'family\\kzndqg', code: 'kzndqg', title: '控制你的情感', titleEn: 'Control Your Emotions', author: '佚名', category: '家庭婚姻', icon: '😌' },
  { src: 'family\\marriage', code: 'marriage', title: '信徒离婚原则汇编', titleEn: 'Believers Divorce Principles', author: '佚名', category: '家庭婚姻', icon: '📜' },
  { src: 'family\\sday-men', code: 'sday_men', title: '圣地爱语', titleEn: 'Holy Land Love Words (For Men)', author: '佚名', category: '家庭婚姻', icon: '💪' },
  { src: 'family\\shufeiyun', code: 'shufeiyun', title: '属飞云', titleEn: 'Shu Fei Yun', author: '佚名', category: '家庭婚姻', icon: '☁️' },
  { src: 'family\\teamwork', code: 'teamwork', title: '建立婚姻中的协调合作', titleEn: 'Building Marriage Teamwork', author: '佚名', category: '家庭婚姻', icon: '🤝' },
  { src: 'family\\wrfmwrsb', code: 'wrfmwrsb', title: '为人父母为人师表', titleEn: 'Be Parents Be Teachers', author: '佚名', category: '家庭婚姻', icon: '👨‍🏫' },
  { src: 'family\\yubeiqincunqi', code: 'yubeiqincunqi', title: '预备青春期', titleEn: 'Preparing for Adolescence', author: '佚名', category: '家庭婚姻', icon: '🧒' },
];

// ─── Helpers ───

function readHtml(filePath) {
  const buf = fs.readFileSync(filePath);
  // Try UTF-8 first (most files have BOM)
  let text = buf.toString('utf8');
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  
  // Check if it decodes properly (Chinese chars present but no replacement chars)
  const hasReplacement = text.indexOf('\uFFFD') !== -1;
  if (hasReplacement) {
    // Try GB18030
    try {
      const iconv = require('iconv-lite');
      text = iconv.decode(buf, 'GB18030');
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    } catch(e) {
      // iconv-lite not available, keep UTF-8
    }
  }
  return text;
}

function extractTitle(html) {
  let m = html.match(/<title>(.*?)<\/title>/i);
  if (!m) return '';
  let title = m[1].trim();
  // Clean up common suffixes
  title = title.replace(/\s*丰盛恩典网站.*$/i, '');
  title = title.replace(/\s*WellsOfGrace\.com.*$/i, '');
  title = title.replace(/\s*WellsofGrace\.com.*$/i, '');
  return title.trim();
}

function extractBody(html) {
  // Extract body content
  let m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let body = m ? m[1] : html;
  
  // Remove scripts, styles, base tags
  body = body.replace(/<script[\s\S]*?<\/script>/gi, '');
  body = body.replace(/<style[\s\S]*?<\/style>/gi, '');
  body = body.replace(/<base[^>]*>/gi, '');
  body = body.replace(/<meta[^>]*>/gi, '');
  body = body.replace(/<link[^>]*>/gi, '');
  
  // Remove nested navigation tables/frames (common in old HTML)
  // Remove <frame>, <frameset>, <noframes>
  body = body.replace(/<frameset[\s\S]*?<\/frameset>/gi, '');
  body = body.replace(/<frame[^>]*>/gi, '');
  body = body.replace(/<noframes[\s\S]*?<\/noframes>/gi, '');
  
  // Clean up old-style HTML attributes
  body = body.replace(/\s+border=\d+/gi, '');
  body = body.replace(/\s+cellSpacing=\d+/gi, '');
  body = body.replace(/\s+cellPadding=\d+/gi, '');
  body = body.replace(/\s+bgColor=#[0-9a-fA-F]+/gi, '');
  body = body.replace(/\s+background=[^>\s]+/gi, '');
  body = body.replace(/\s+vLink=#[0-9a-fA-F]+/gi, '');
  body = body.replace(/\s+aLink=#[0-9a-fA-F]+/gi, '');
  body = body.replace(/\s+link=#[0-9a-fA-F]+/gi, '');
  body = body.replace(/\s+text=#[0-9a-fA-F]+/gi, '');
  
  // Remove <font> tags but keep content
  body = body.replace(/<font[^>]*>/gi, '');
  body = body.replace(/<\/font>/gi, '');
  
  // Remove <center> tags
  body = body.replace(/<center>/gi, '');
  body = body.replace(/<\/center>/gi, '');
  
  // Remove tppabs attribute (leftover from offline browser tools)
  body = body.replace(/\s+tppabs="[^"]*"/gi, '');
  
  // Convert <B> to <strong>, <I> to <em>
  body = body.replace(/<B>/gi, '<strong>');
  body = body.replace(/<\/B>/gi, '</strong>');
  body = body.replace(/<I>/gi, '<em>');
  body = body.replace(/<\/I>/gi, '</em>');
  
  // Clean up excessive whitespace
  body = body.replace(/\n{3,}/g, '\n\n');
  body = body.replace(/\s{2,}/g, ' ');
  
  // If body is mostly table structure with one main content cell, try to extract
  // Look for the largest <td> content
  const tds = body.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);
  if (tds && tds.length > 3) {
    let largest = '';
    let largestLen = 0;
    for (const td of tds) {
      const content = td.replace(/<td[^>]*>/i, '').replace(/<\/td>/i, '');
      const textLen = content.replace(/<[^>]+>/g, '').length;
      if (textLen > largestLen) {
        largestLen = textLen;
        largest = content;
      }
    }
    if (largestLen > 200) {
      body = largest;
    }
  }
  
  return body.trim();
}

function shouldSkipFile(fileName) {
  const lower = fileName.toLowerCase();
  // Skip index, navigation, frame files
  if (lower === 'index.html' || lower === 'index.htm') return true;
  if (lower === 'left.htm' || lower === 'left.html') return true;
  if (lower === 'content.htm' || lower === 'content.html') return true;
  if (lower === '00.htm' || lower === '00.html') return true;
  if (lower === 'sbz.htm') return true;
  if (lower === 'xlink.htm') return true;
  if (lower === 'topic.htm') return true;
  // Skip files that are just "Page Not Found"
  return false;
}

function isPageNotFound(html) {
  return html.includes('Page Not Found') && html.length < 2000;
}

// ─── Main conversion ───

let totalBooks = 0;
let totalChapters = 0;
let totalErrors = 0;
const results = [];

for (const book of BOOKS) {
  if (book.skip) {
    results.push({ ...book, status: 'SKIP', chapters: 0 });
    continue;
  }
  
  const srcDir = path.join(SRC_BASE, book.src);
  if (!fs.existsSync(srcDir)) {
    console.log(`[MISS] ${book.code}: source dir not found: ${srcDir}`);
    results.push({ ...book, status: 'MISS', chapters: 0 });
    totalErrors++;
    continue;
  }
  
  // Get all HTML files recursively (content often in htm/ subdir), sorted
  let allFiles = [];
  function scanDir(dir, relBase) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = relBase ? relBase + '/' + entry.name : entry.name;
      if (entry.isDirectory()) {
        // Skip non-content dirs
        if (entry.name === 'images' || entry.name === 'css' || entry.name === 'js') continue;
        scanDir(fullPath, relPath);
      } else if (/\.(htm|html)$/i.test(entry.name)) {
        allFiles.push({ name: entry.name, fullPath, relPath });
      }
    }
  }
  scanDir(srcDir, '');
  let htmlFiles = allFiles
    .filter(f => !shouldSkipFile(f.name))
    .sort((a, b) => a.relPath.localeCompare(b.relPath, 'zh-CN', { numeric: true }));
  
  // Read and filter out "Page Not Found" files
  const chapters = [];
  for (const fileInfo of htmlFiles) {
    const filePath = fileInfo.fullPath;
    const stat = fs.statSync(filePath);
    if (stat.size < 300) continue; // skip tiny files
    
    const html = readHtml(filePath);
    if (isPageNotFound(html)) continue;
    
    // Skip frameset pages (they just reference other files)
    if (/<frameset/i.test(html) && html.length < 3000) continue;
    
    const title = extractTitle(html);
    const content = extractBody(html);
    
    if (content.length < 100) continue; // skip near-empty
    
    // Generate chapter ID (001, 002, ...)
    const id = String(chapters.length + 1).padStart(3, '0');
    
    chapters.push({
      id,
      title: title || `第${chapters.length + 1}章`,
      content
    });
  }
  
  if (chapters.length === 0) {
    console.log(`[EMPTY] ${book.code}: no valid chapters found`);
    results.push({ ...book, status: 'EMPTY', chapters: 0 });
    totalErrors++;
    continue;
  }
  
  // Create output directory
  const outDir = path.join(OUT_BASE, book.code);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  // Write meta.json
  const meta = {
    code: book.code,
    title: book.title,
    titleEn: book.titleEn,
    author: book.author,
    category: book.category,
    icon: book.icon,
    language: book.titleEn && book.title !== book.titleEn && /^[A-Z]/.test(book.titleEn) ? 'en' : 'zh',
    totalChapters: chapters.length,
    chapters: chapters.map(c => ({ id: c.id, title: c.title, category: book.category }))
  };
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
  
  // Write chapter files
  for (const ch of chapters) {
    fs.writeFileSync(
      path.join(outDir, ch.id + '.json'),
      JSON.stringify({ id: ch.id, title: ch.title, category: book.category, content: ch.content }),
      'utf8'
    );
  }
  
  const totalSize = chapters.reduce((sum, ch) => sum + Buffer.byteLength(ch.content, 'utf8'), 0);
  console.log(`[OK] ${book.code}: ${chapters.length} chapters, ${(totalSize / 1024).toFixed(0)} KB — ${book.title}`);
  
  results.push({ ...book, status: 'OK', chapters: chapters.length, sizeKB: Math.round(totalSize / 1024) });
  totalBooks++;
  totalChapters += chapters.length;
}

// ─── Summary ───
console.log('\n=== Conversion Summary ===');
console.log(`Books converted: ${totalBooks}`);
console.log(`Total chapters: ${totalChapters}`);
console.log(`Errors: ${totalErrors}`);

// Write summary JSON for the report
const summary = {
  timestamp: new Date().toISOString(),
  totalBooks,
  totalChapters,
  results: results.map(r => ({
    code: r.code,
    title: r.title,
    titleEn: r.titleEn,
    author: r.author,
    category: r.category,
    icon: r.icon,
    chapters: r.chapters,
    status: r.status,
    sizeKB: r.sizeKB || 0
  }))
};
fs.writeFileSync(path.join(OUT_BASE, '_conversion-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log(`\nSummary written to: ${path.join(OUT_BASE, '_conversion-summary.json')}`);
