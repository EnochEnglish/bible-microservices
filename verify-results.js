const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, 'frontend', 'library-data');
const books = ['bl_psalm_ch', 'bl_newlife_ch', 'bl_newlive_ch', 'bl_jword_ch', 'bl_theology_ch'];
const lines = [];
for (const b of books) {
    try {
        const m = JSON.parse(fs.readFileSync(path.join(base, b, 'meta.json'), 'utf8'));
        const c = JSON.parse(fs.readFileSync(path.join(base, b, '001.json'), 'utf8'));
        const cn = (c.content.match(/[\u4e00-\u9fff]/g) || []).length;
        lines.push(b + ': ' + m.chapters.length + 'ch, title=' + m.title + ', ch1=' + c.title + ', cn=' + cn);
        lines.push('  first80: ' + c.content.substring(0, 80));
    } catch(e) {
        lines.push(b + ': ERROR - ' + e.message);
    }
}
fs.writeFileSync(path.join(__dirname, 'verify-results.txt'), lines.join('\n'), 'utf8');
console.log('Done');
