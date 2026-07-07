// Fix all bl_* book meta.json files:
// Change "chapters": <number> to "chapters": [{id, title, category}] array
// Also read each chapter JSON to get the title

const fs = require('fs');
const path = require('path');

const baseDir = 'D:\\dev\\github\\bible-microservices\\frontend\\library-data';
const dirs = fs.readdirSync(baseDir).filter(d => d.startsWith('bl_') && fs.statSync(path.join(baseDir, d)).isDirectory());

let fixed = 0;
for (const dir of dirs) {
    const metaPath = path.join(baseDir, dir, 'meta.json');
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    
    if (Array.isArray(meta.chapters)) {
        // Already fixed
        continue;
    }
    
    const chapterCount = meta.chapters || 0;
    const chapters = [];
    
    // Read each chapter file to get title
    for (let i = 1; i <= chapterCount; i++) {
        const chPath = path.join(baseDir, dir, `${i}.json`);
        try {
            const ch = JSON.parse(fs.readFileSync(chPath, 'utf8'));
            chapters.push({
                id: String(i).padStart(3, '0'),
                title: ch.title || `第${i}章`,
                category: meta.category || ''
            });
        } catch(e) {
            chapters.push({
                id: String(i).padStart(3, '0'),
                title: `第${i}章`,
                category: meta.category || ''
            });
        }
    }
    
    // Update meta
    meta.totalChapters = chapterCount;
    meta.chapters = chapters;
    
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
    fixed++;
    console.log(`Fixed: ${dir} - ${chapterCount} chapters`);
}

console.log(`\nTotal fixed: ${fixed} books`);

// Also fix index.json
const indexPath = path.join(baseDir, 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
let updated = 0;
for (const book of index.books) {
    if (book.code && book.code.startsWith('bl_') && typeof book.chapters === 'number') {
        // Find the book's meta to get chapters array
        const metaPath = path.join(baseDir, book.code, 'meta.json');
        try {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
            book.totalChapters = meta.totalChapters;
            book.chapters = meta.chapters;
            updated++;
        } catch(e) {}
    }
}
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
console.log(`Index updated: ${updated} books`);
