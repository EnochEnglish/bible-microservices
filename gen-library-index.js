// Generate library-data/index.json — auto-discover all books from their meta.json files
// Run: node gen-library-index.js
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'frontend', 'library-data');
const dirs = fs.readdirSync(dataDir).filter(d => {
  const p = path.join(dataDir, d);
  return fs.statSync(p).isDirectory();
});

const books = [];
for (const dir of dirs) {
  const metaPath = path.join(dataDir, dir, 'meta.json');
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      books.push({
        code: meta.code || dir,
        title: meta.title,
        titleEn: meta.titleEn || meta.title,
        author: meta.author || '',
        category: meta.category || '',
        icon: meta.icon || '📕',
        chapters: meta.totalChapters || 0
      });
    } catch(e) {
      console.warn('Skip ' + dir + ': ' + e.message);
    }
  }
}

// Sort by category then title
books.sort((a, b) => {
  const c = (a.category || '').localeCompare(b.category || '', 'zh-CN');
  if (c !== 0) return c;
  return (a.title || '').localeCompare(b.title || '', 'zh-CN');
});

const index = {
  totalBooks: books.length,
  totalChapters: books.reduce((s, b) => s + b.chapters, 0),
  books: books
};

fs.writeFileSync(path.join(dataDir, 'index.json'), JSON.stringify(index, null, 2), 'utf8');
console.log('Generated index.json: ' + books.length + ' books, ' + index.totalChapters + ' chapters');
