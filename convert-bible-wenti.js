/**
 * Convert bible_wenti HTML files to static JSON for library integration.
 * 
 * Input: D:\dev\usebible.com\html\bible_wenti\*.htm (UTF-8 with BOM, despite GB2312 meta tag)
 * Output: D:\dev\github\bible-microservices\frontend\library-data\bible_wenti\
 *   - meta.json  (book info + chapter tree)
 *   - 001.json, 002.json, ... (chapter content)
 * 
 * Categories:
 *   bibleqaNNN    → 解经问题 (102篇)
 *   bibleqashNNN  → 生活问题 (41篇)
 *   bibleqasxNNN  → 神学问题 (29篇)
 *   bibleqajhNNN  → 教会问题 (11篇)
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = 'D:\\dev\\usebible.com\\html\\bible_wenti';
const OUT_DIR = 'D:\\dev\\github\\bible-microservices\\frontend\\library-data\\bible_wenti';

// Ensure output dir
fs.mkdirSync(OUT_DIR, { recursive: true });

// Category mapping
const CATEGORIES = [
  { prefix: 'bibleqa',    name: '解经问题', nameEn: 'Interpretation',    seqPad: 3 },
  { prefix: 'bibleqash',  name: '生活问题', nameEn: 'Life Issues',       seqPad: 4 },
  { prefix: 'bibleqasx',  name: '神学问题', nameEn: 'Theology',          seqPad: 3 },
  { prefix: 'bibleqajh',  name: '教会问题', nameEn: 'Church Issues',     seqPad: 3 },
];

/**
 * Read HTM file, strip BOM, return content
 */
function readHtm(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  // Strip BOM
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return content;
}

/**
 * Extract <TITLE> content
 */
function extractTitle(html) {
  const m = html.match(/<TITLE>([\s\S]*?)<\/TITLE>/i);
  if (m) return m[1].trim();
  return '';
}

/**
 * Extract body content, clean up old HTML tags
 */
function extractBody(html) {
  // Get content between <BODY> and </BODY>
  let body = html.match(/<BODY[^>]*>([\s\S]*?)<\/BODY>/i);
  let content = body ? body[1] : html;
  
  // Remove the first <CENTER>...title... block (it's the duplicate of TITLE)
  content = content.replace(/<CENTER>[\s\S]*?<\/CENTER>/i, '');
  
  // Remove <FONT ...> tags but keep content
  content = content.replace(/<FONT[^>]*>/gi, '');
  content = content.replace(/<\/FONT>/gi, '');
  
  // Remove <B> wrappers around titles (keep text)
  // Convert <P> to proper paragraphs
  content = content.replace(/<P[^>]*>/gi, '<p>');
  content = content.replace(/<\/P>/gi, '</p>');
  
  // Clean up empty paragraphs
  content = content.replace(/<p>\s*<\/p>/gi, '');
  
  // Remove <!-- ... --> comments
  content = content.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove <META>, <BASE>, <SPAN> tags
  content = content.replace(/<META[^>]*>/gi, '');
  content = content.replace(/<BASE[^>]*>/gi, '');
  content = content.replace(/<\/?SPAN[^>]*>/gi, '');
  
  // Remove tppabs attributes
  content = content.replace(/\s+tppabs="[^"]*"/gi, '');
  
  // Convert <BR> to proper line breaks
  content = content.replace(/<BR\s*\/?>/gi, '<br>');
  
  // Clean up whitespace
  content = content.replace(/\r\n/g, '\n');
  content = content.replace(/\n{3,}/g, '\n\n');
  content = content.trim();
  
  return content;
}

/**
 * Determine category and sequence number from filename
 */
function parseFilename(filename) {
  for (const cat of CATEGORIES) {
    // Match prefix followed by digits
    const re = new RegExp(`^${cat.prefix}(\\d+)\\.htm$`, 'i');
    const m = filename.match(re);
    if (m) {
      return {
        category: cat.name,
        categoryEn: cat.nameEn,
        prefix: cat.prefix,
        seq: parseInt(m[1], 10),
      };
    }
  }
  return null;
}

// ─── Main ───

const files = fs.readdirSync(SRC_DIR).filter(f => f.endsWith('.htm'));
console.log(`Found ${files.length} HTM files`);

const chapters = [];
let chapterIdx = 0;

for (const file of files) {
  const parsed = parseFilename(file);
  if (!parsed) {
    console.log(`  SKIP: ${file} (not a content file)`);
    continue;
  }

  const html = readHtm(path.join(SRC_DIR, file));
  const title = extractTitle(html);
  const content = extractBody(html);

  chapterIdx++;
  
  chapters.push({
    id: String(chapterIdx).padStart(3, '0'),
    title: title,
    category: parsed.category,
    categoryEn: parsed.categoryEn,
    sourceFile: file,
    originalPrefix: parsed.prefix,
    originalSeq: parsed.seq,
  });

  // Write chapter JSON
  const chapterJson = {
    id: String(chapterIdx).padStart(3, '0'),
    title: title,
    category: parsed.category,
    categoryEn: parsed.categoryEn,
    content: content,
  };
  
  fs.writeFileSync(
    path.join(OUT_DIR, `${chapterJson.id}.json`),
    JSON.stringify(chapterJson, null, 2),
    'utf-8'
  );
}

// Build category tree
const categoryTree = {};
for (const ch of chapters) {
  if (!categoryTree[ch.category]) {
    categoryTree[ch.category] = [];
  }
  categoryTree[ch.category].push({
    id: ch.id,
    title: ch.title,
  });
}

// Write meta.json
const meta = {
  bookCode: 'bible_wenti',
  title: '圣经问题解答',
  titleEn: 'Bible Questions & Answers',
  author: '陈终道',
  publisher: '宣道书局1977年5月第5版',
  description: '陈终道牧师的《圣经问题解答》，根据圣经的原则解答最常见的"解经问题"、"生活问题"、"神学问题"及"教会问题"，帮助你了解许多疑问，解开心里的困惑',
  totalChapters: chapters.length,
  categories: Object.keys(categoryTree).map(cat => ({
    name: cat,
    chapters: categoryTree[cat],
  })),
  chapters: chapters.map(ch => ({
    id: ch.id,
    title: ch.title,
    category: ch.category,
  })),
};

fs.writeFileSync(
  path.join(OUT_DIR, 'meta.json'),
  JSON.stringify(meta, null, 2),
  'utf-8'
);

console.log(`\nDone! ${chapters.length} chapters converted.`);
console.log(`Output: ${OUT_DIR}`);
console.log(`\nCategory breakdown:`);
for (const [cat, items] of Object.entries(categoryTree)) {
  console.log(`  ${cat}: ${items.length} 篇`);
}
