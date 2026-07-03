// Add library link to mobile index.html bottom navigation
const fs = require('fs');
const filePath = 'D:\\dev\\github\\bible-microservices\\frontend\\m\\index.html';
let content = fs.readFileSync(filePath, 'utf8');

if (content.indexOf('library.html') === -1) {
  // Add a library link in the bottom nav area
  // Find the desktopLink and add library link nearby
  const oldHtml = '<a href="../index.html"';
  if (content.indexOf(oldHtml) !== -1) {
    const newHtml = '<a href="../library.html" class="nav-btn" data-i18n="library">\ud83d\udcda \u56fe\u4e66\u9986</a>\n      <a href="../index.html"';
    content = content.replace(oldHtml, newHtml);
    console.log('Added library link to mobile index.html');
  } else {
    // Try alternative: add before closing nav
    console.log('Could not find desktopLink anchor, trying alternative');
  }
} else {
  console.log('Library link already exists');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done.');
