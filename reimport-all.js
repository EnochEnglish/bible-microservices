// Step 1: Remove all bl_* directories
// Step 2: Reimport with fixed extractor
// Step 3: Fix meta.json and chapter filenames

const fs = require('fs');
const path = require('path');

const baseDir = 'D:\\dev\\github\\bible-microservices\\frontend\\library-data';

// Step 1: Remove bl_* dirs
console.log('=== Step 1: Removing old bl_* directories ===');
const dirs = fs.readdirSync(baseDir).filter(d => d.startsWith('bl_'));
for (const dir of dirs) {
    fs.rmSync(path.join(baseDir, dir), { recursive: true });
}
console.log(`Removed ${dirs.length} directories`);

// Step 2: Reimport
console.log('\n=== Step 2: Reimporting with fixed extractor ===');
const { execSync } = require('child_process');
execSync('node import-blessed-final.js', { 
    cwd: 'D:\\dev\\github\\bible-microservices',
    stdio: 'inherit',
    timeout: 120000
});

// Step 3: Fix meta.json
console.log('\n=== Step 3: Fixing meta.json ===');
const newDirs = fs.readdirSync(baseDir).filter(d => d.startsWith('bl_'));
let fixed = 0;
for (const dir of newDirs) {
    const metaPath = path.join(baseDir, dir, 'meta.json');
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    
    if (Array.isArray(meta.chapters)) continue;
    
    const chapterCount = meta.chapters || 0;
    const chapters = [];
    for (let i = 1; i <= chapterCount; i++) {
        const chPath = path.join(baseDir, dir, `${i}.json`);
        try {
            const ch = JSON.parse(fs.readFileSync(chPath, 'utf8'));
            chapters.push({ id: String(i).padStart(3, '0'), title: ch.title || `第${i}章`, category: meta.category || '' });
        } catch(e) {
            chapters.push({ id: String(i).padStart(3, '0'), title: `第${i}章`, category: meta.category || '' });
        }
    }
    meta.totalChapters = chapterCount;
    meta.chapters = chapters;
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf8');
    fixed++;
}
console.log(`Fixed ${fixed} meta.json files`);

// Step 4: Rename chapter files to 3-digit format
console.log('\n=== Step 4: Renaming chapter files ===');
let renamed = 0;
for (const dir of newDirs) {
    const dirPath = path.join(baseDir, dir);
    const files = fs.readdirSync(dirPath).filter(f => /^\d+\.json$/.test(f) && !/^0\d+\.json$/.test(f));
    for (const file of files) {
        const num = parseInt(file);
        const padded = String(num).padStart(3, '0') + '.json';
        fs.renameSync(path.join(dirPath, file), path.join(dirPath, padded));
        renamed++;
    }
}
console.log(`Renamed ${renamed} files`);

// Step 5: Update index.json
console.log('\n=== Step 5: Updating index.json ===');
const indexPath = path.join(baseDir, 'index.json');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
// Remove old bl_* entries
index.books = index.books.filter(b => !b.code || !b.code.startsWith('bl_'));
// Re-read all bl_* meta.json
for (const dir of newDirs) {
    const metaPath = path.join(baseDir, dir, 'meta.json');
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    index.books.push({
        code: meta.code,
        initials: meta.code,
        name: meta.title,
        nameEn: meta.titleEn,
        author: meta.author,
        category: meta.category,
        icon: meta.icon,
        source: meta.source,
        isStatic: true,
        totalChapters: meta.totalChapters,
        chapters: meta.chapters
    });
}
index.totalBooks = index.books.length;
index.totalChapters = index.books.reduce((s, b) => s + (b.totalChapters || 0), 0);
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
console.log(`Index updated: ${index.totalBooks} books, ${index.totalChapters} chapters`);

// Verify
console.log('\n=== Verification ===');
const verifyMeta = JSON.parse(fs.readFileSync(path.join(baseDir, 'bl_psalm_ch', 'meta.json'), 'utf8'));
console.log(`bl_psalm_ch: ${verifyMeta.chapters.length} chapters, first: ${verifyMeta.chapters[0].title}`);
const verifyCh = JSON.parse(fs.readFileSync(path.join(baseDir, 'bl_psalm_ch', '001.json'), 'utf8'));
console.log(`Chapter 001: title="${verifyCh.title}", content=${verifyCh.content.length} chars`);
console.log(`First 200: ${verifyCh.content.substring(0, 200)}`);
console.log('\nDone!');
