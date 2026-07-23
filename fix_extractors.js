const fs = require('fs');
const p = 'D:/dev/github/bible-microservices/bible-monolith/src/main/kotlin/com/bible/monolith/kb/service/KbIndexService.kt';
let src = fs.readFileSync(p, 'utf8');

// Remove extractLibraryDocs from buildAll extractors list
// Only keep extractBibleDocs, library is handled by processLibraryIncremental
const old = `val extractors = listOf<( ) -> List<KbDocument>>(
            { extractBibleDocs(zhOnly) },
            { extractLibraryDocs(zhOnly) }
        )`;

const nw = `val extractors = listOf<( ) -> List<KbDocument>>(
            { extractBibleDocs(zhOnly) }
            // Library is processed incrementally below via processLibraryIncremental
        )`;

if (src.includes(old)) {
    src = src.replace(old, nw);
    console.log('Removed extractLibraryDocs from buildAll extractors');
} else {
    console.log('NOT FOUND');
}

fs.writeFileSync(p, src, 'utf8');
console.log('Done');
