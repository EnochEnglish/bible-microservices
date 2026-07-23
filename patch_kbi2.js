const fs = require('fs');
const p = 'D:/dev/github/bible-microservices/bible-monolith/src/main/kotlin/com/bible/monolith/kb/service/KbIndexService.kt';
let src = fs.readFileSync(p, 'utf8');

// Fix 1: processLibraryIncremental — add zhOnly parameter
const old1 = 'private fun processLibraryIncremental(progressCallback: ((BuildProgress) -> Unit)?) {';
const new1 = 'private fun processLibraryIncremental(progressCallback: ((BuildProgress) -> Unit)?, zhOnly: Boolean = false) {';
if (src.includes(old1)) {
    src = src.replace(old1, new1);
    console.log('1. processLibraryIncremental: added zhOnly param');
} else {
    console.log('1. processLibraryIncremental: NOT FOUND');
}

// Fix 2: processLibraryIncremental call sites — add zhOnly
// Line 143: processLibraryIncremental(progressCallback) — in buildAll?
const old2 = 'processLibraryIncremental(progressCallback)';
const new2 = 'processLibraryIncremental(progressCallback, zhOnly)';
// This appears twice (line 143 and 587), replace both
let count = 0;
while (src.includes(old2)) {
    src = src.replace(old2, new2);
    count++;
}
console.log('2. processLibraryIncremental calls: replaced', count);

// Fix 3: buildSource — add zhOnly to the call inside it  
// Line 587 is in buildSource which may not have zhOnly param — check
// buildSource already has zhOnly param (from previous patches)

fs.writeFileSync(p, src, 'utf8');
console.log('Done.');
