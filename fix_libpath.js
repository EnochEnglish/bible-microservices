const fs = require('fs');
const p = 'D:/dev/github/bible-microservices/bible-monolith/src/main/kotlin/com/bible/monolith/kb/service/KbIndexService.kt';
let src = fs.readFileSync(p, 'utf8');

// Fix 1: @Value property name should match application.yml: kb.library-path
const old1 = '@Value("\\${kb.sources.library.path:library-data}")';
const new1 = '@Value("\\${kb.library-path:frontend/library-data}")';

if (src.includes(old1)) {
    src = src.replace(old1, new1);
    console.log('Fixed @Value: kb.sources.library.path -> kb.library-path');
} else {
    console.log('NOT FOUND: ' + old1);
}

fs.writeFileSync(p, src, 'utf8');
console.log('Done');
