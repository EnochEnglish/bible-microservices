// Generate STATIC_BOOKS array for library.js from meta.json files
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'frontend', 'library-data');
const dirs = fs.readdirSync(dataDir).filter(d => {
  return fs.statSync(path.join(dataDir, d)).isDirectory() && d !== '_conversion-summary.json';
});

const books = [];
for (const dir of dirs) {
  const metaPath = path.join(dataDir, dir, 'meta.json');
  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    books.push({
      code: meta.code,
      title: meta.title,
      titleEn: meta.titleEn,
      author: meta.author,
      category: meta.category,
      icon: meta.icon || '📕',
      chapters: meta.totalChapters
    });
  }
}

// Sort by category then title
books.sort((a, b) => {
  const c = (a.category || '').localeCompare(b.category || '', 'zh-CN');
  if (c !== 0) return c;
  return (a.title || '').localeCompare(b.title || '', 'zh-CN');
});

// Generate JS code
const lines = books.map(b => {
  const title = b.title.replace(/'/g, "\\'");
  const titleEn = (b.titleEn || '').replace(/'/g, "\\'");
  const author = (b.author || '').replace(/'/g, "\\'");
  const cat = (b.category || '').replace(/'/g, "\\'");
  return `  { code: '${b.code}', title: '${title}', titleEn: '${titleEn}', author: '${author}', category: '${cat}', icon: '${b.icon}' }`;
});

console.log('var STATIC_BOOKS = [');
console.log(lines.join(',\n'));
console.log('];');
console.log('\n// Total: ' + books.length + ' books');
