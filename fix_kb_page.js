const fs = require('fs');
const p = 'D:/dev/github/bible-microservices/frontend/plugins/knowledge-base/index.html';
let src = fs.readFileSync(p, 'utf8');

// ─── Fix 1: Scroll bar ─── add overflow-y:auto to body
if (src.includes('min-height: 100vh;')) {
    src = src.replace(
        '    body {\n      background: var(--bg, #0f1117);\n      color: var(--text, #e4e6f0);\n      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\n      min-height: 100vh;\n    }',
        '    html, body {\n      height: 100%; margin: 0; padding: 0;\n    }\n    body {\n      background: var(--bg, #0f1117);\n      color: var(--text, #e4e6f0);\n      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\n      min-height: 100vh;\n      overflow-y: auto;\n    }'
    );
    console.log('Fix 1: Added overflow-y:auto for scrolling');
} else { console.log('Fix 1: NOT FOUND'); }

// ─── Fix 2: Library bookId parsing ─── parts[2] → parts[0]
const oldBookId = "var parts = r.sourceRef.split('/');\n        var bookId = parts[2] || '';";
const newBookId = "var parts = r.sourceRef.split('/');\n        var bookId = parts[0] || '';\n        var chapterId = parts[1] || '';";
if (src.includes(oldBookId)) {
    src = src.replace(oldBookId, newBookId);
    // Also fix the href
    src = src.replace(
        "return '<div class=\"kb-result-link\"><a href=\"/library/book/' + encodeURIComponent(bookId) + '\" target=\"_blank\">",
        "return '<div class=\"kb-result-link\"><a href=\"/library/book/' + encodeURIComponent(bookId) + '/' + encodeURIComponent(chapterId) + '\" target=\"_blank\">"
    );
    console.log('Fix 2: Fixed library bookId from parts[2] to parts[0]');
} else {
    // Try alternative match
    const alt = "var parts = r.sourceRef.split('/');\n        var bookId = parts[2] || '';";
    if (src.includes(alt)) {
        src = src.replace(alt, newBookId);
        console.log('Fix 2 (alt): Fixed library bookId');
    } else {
        console.log('Fix 2: NOT FOUND');
    }
}

// ─── Fix 3: Dictionary link parsing ─── parts[1]/parts[2] → parts[0]/parts[1]
const oldDict = "var dparts = r.sourceRef.split('/');\n        var mod = dparts[1] || r.module || '';\n        var key = dparts[2] || '';";
const newDict = "var dparts = r.sourceRef.split('/');\n        var mod = dparts[0] || r.module || '';\n        var key = dparts[1] || '';";
if (src.includes(oldDict)) {
    src = src.replace(oldDict, newDict);
    console.log('Fix 3: Fixed dictionary sourceRef parsing');
} else { console.log('Fix 3: NOT FOUND'); }

fs.writeFileSync(p, src, 'utf8');
console.log('All fixes applied');
