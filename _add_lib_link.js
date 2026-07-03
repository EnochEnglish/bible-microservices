// Node.js: add library link to index.html topbar (safe UTF-8 edit)
const fs = require('fs');
const path = require('path');

const filePath = 'D:\\dev\\github\\bible-microservices\\frontend\\index.html';
let content = fs.readFileSync(filePath, 'utf8');

// Check if library link already exists
if (content.indexOf('library.html') === -1) {
  // Add library link after the mobileLink, before translationSelect
  const oldHtml = '<a id="mobileLink" href="m/" title="Mobile Version"';
  const newHtml = '<a href="library.html" class="topbar-btn" title="Christian Library" data-zh-title="\u56fe\u4e66\u9986" data-en-title="Library" style="text-decoration:none;font-size:1.1rem;flex-shrink:0;">\ud83d\udcda <span data-zh="\u56fe\u4e66\u9986" data-en="Library">\u56fe\u4e66\u9986</span></a>\n  <a id="mobileLink" href="m/" title="Mobile Version"';
  content = content.replace(oldHtml, newHtml);
  console.log('Added library link to index.html topbar');
} else {
  console.log('Library link already exists in index.html');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done. UTF-8 no-BOM.');
