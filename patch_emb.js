const fs = require('fs');
const p = 'D:/dev/github/bible-microservices/bible-monolith/src/main/kotlin/com/bible/monolith/kb/service/KbEmbeddingService.kt';
let src = fs.readFileSync(p, 'utf8');

const old = 'allModelIds = listOf("tfidf_256", "bgesmall_512", "bgebase_768")';
const nw = 'allModelIds = listOf("tfidf_256", "bgesmall_512")';

if (src.includes(old)) {
    src = src.replace(old, nw);
    fs.writeFileSync(p, src, 'utf8');
    console.log('Removed bgebase_768 from allModelIds');
} else {
    console.log('NOT FOUND');
}
