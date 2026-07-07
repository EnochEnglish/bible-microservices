// Rename chapter files from N.json to 00N.json (3-digit zero-padded)
const fs = require('fs');
const path = require('path');

const baseDir = 'D:\\dev\\github\\bible-microservices\\frontend\\library-data';
const dirs = fs.readdirSync(baseDir).filter(d => d.startsWith('bl_') && fs.statSync(path.join(baseDir, d)).isDirectory());

let renamed = 0;
for (const dir of dirs) {
    const dirPath = path.join(baseDir, dir);
    const files = fs.readdirSync(dirPath).filter(f => /^\d+\.json$/.test(f) && !/^0\d+\.json$/.test(f));
    
    for (const file of files) {
        const num = parseInt(file);
        const padded = String(num).padStart(3, '0') + '.json';
        const oldPath = path.join(dirPath, file);
        const newPath = path.join(dirPath, padded);
        
        if (!fs.existsSync(newPath)) {
            fs.renameSync(oldPath, newPath);
            renamed++;
            console.log(`  ${dir}: ${file} -> ${padded}`);
        } else {
            // Both exist, remove the old one
            fs.unlinkSync(oldPath);
            console.log(`  ${dir}: ${file} removed (already has ${padded})`);
        }
    }
}
console.log(`\nTotal renamed: ${renamed}`);
