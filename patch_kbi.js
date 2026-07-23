const fs = require('fs');
const p = 'D:/dev/github/bible-microservices/bible-monolith/src/main/kotlin/com/bible/monolith/kb/service/KbIndexService.kt';
let src = fs.readFileSync(p, 'utf8');

// 1. Add zhOnly filter in extractLibraryDocs (first occurrence)
const old1 = 'val language = meta.get("language")?.asText() ?: "zh"\n                \n                val bookDocs = mutableListOf<KbDocument>()';
const new1 = `val language = meta.get("language")?.asText() ?: "zh"
                
                // zhOnly: skip non-Chinese books
                if (zhOnly) {
                    val isCJK = bookTitle.any { it.code in 0x4e00..0x9fff }
                    if (language != "zh" && !isCJK) {
                        log.info("  Skipping non-Chinese book: {} ({})", bookCode, language)
                        continue
                    }
                }
                
                val bookDocs = mutableListOf<KbDocument>()`;

const i1 = src.indexOf(old1);
console.log('extractLibraryDocs zhOnly filter:', i1 >= 0 ? 'FOUND' : 'NOT FOUND');
if (i1 >= 0) {
    src = src.substring(0, i1) + new1 + src.substring(i1 + old1.length);
}

// 2. Add extractLibraryDocs to buildAll extractors list
const old2 = 'val extractors = listOf<( ) -> List<KbDocument>>(\n            { extractBibleDocs(zhOnly) }\n        )';
const new2 = `val extractors = listOf<( ) -> List<KbDocument>>(
            { extractBibleDocs(zhOnly) },
            { extractLibraryDocs(zhOnly) }
        )`;

const i2 = src.indexOf(old2);
console.log('buildAll extractors list:', i2 >= 0 ? 'FOUND' : 'NOT FOUND');
if (i2 >= 0) {
    src = src.substring(0, i2) + new2 + src.substring(i2 + old2.length);
}

fs.writeFileSync(p, src, 'utf8');
console.log('Done.');
