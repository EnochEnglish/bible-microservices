const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, 'frontend', 'library-data');
const index = JSON.parse(fs.readFileSync(path.join(base, 'index.json'), 'utf8'));
let totalChars = 0, totalCN = 0, totalChapters = 0;
const blBooks = index.books.filter(b => b.code && b.code.startsWith('bl_'));
const lines = [];
for (const book of blBooks) {
    for (const ch of book.chapters) {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(base, book.code, ch.id + '.json'), 'utf8'));
            totalChars += data.content.length;
            totalCN += (data.content.match(/[\u4e00-\u9fff]/g) || []).length;
            totalChapters++;
        } catch(e) {}
    }
}
lines.push(`Blessed.org books: ${blBooks.length}`);
lines.push(`Total chapters: ${totalChapters}`);
lines.push(`Total chars: ${totalChars.toLocaleString()}`);
lines.push(`Chinese chars: ${totalCN.toLocaleString()}`);
lines.push(`Library total books: ${index.totalBooks}`);
lines.push(`Library total chapters: ${index.totalChapters}`);
fs.writeFileSync(path.join(__dirname, 'blessed-stats.txt'), lines.join('\n'), 'utf8');
