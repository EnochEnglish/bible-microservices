// Test full pipeline for psalm-ch.doc
const { extractDocText } = require('./ole2-extractor');
const fs = require('fs');

const text = extractDocText('D:\\dev\\usebible.com\\html\\blessed\\chinese\\download\\sermon1\\psalm-ch.doc');
console.log('Extracted:', text.length, 'chars,', (text.match(/[\u4e00-\u9fff]/g) || []).length, 'Chinese');

// Now test splitChapters
function splitChapters(text) {
    const matches = [...text.matchAll(/第[一二三四五六七八九十百零\d]+[课章讲篇]/g)];
    console.log('Chapter matches:', matches.length);
    matches.slice(0, 5).forEach((m, i) => console.log(`  ${i}: "${m[0]}" at ${m.index}`));
    
    if (matches.length > 1) {
        const chapters = [];
        for (let i = 0; i < matches.length; i++) {
            const start = matches[i].index;
            const end = i + 1 < matches.length ? matches[i+1].index : text.length;
            const title = matches[i][0];
            const content = text.substring(start, end).trim();
            if (content.length > 50) chapters.push({ title, content });
        }
        if (chapters.length > 0) {
            console.log('Chapters:', chapters.length);
            console.log('First chapter:', chapters[0].title, 'content:', chapters[0].content.substring(0, 100));
            return chapters;
        }
    }
    
    return [{ title: '全文', content: text }];
}

const chapters = splitChapters(text);
console.log('\nResult:', chapters.length, 'chapters');
console.log('First chapter content (first 200):', chapters[0].content.substring(0, 200));

// Write as JSON
const json = JSON.stringify({ id: 1, title: chapters[0].title, content: chapters[0].content });
console.log('\nJSON length:', json.length);
fs.writeFileSync('test-chapter.json', json, 'utf8');
const readback = JSON.parse(fs.readFileSync('test-chapter.json', 'utf8'));
console.log('Readback content (first 200):', readback.content.substring(0, 200));
