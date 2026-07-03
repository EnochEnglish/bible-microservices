// Add library link to mobile index.html - find the desktopLink anchor
const fs = require('fs');
const filePath = 'D:\\dev\\github\\bible-microservices\\frontend\\m\\index.html';
let content = fs.readFileSync(filePath, 'utf8');

if (content.indexOf('library.html') === -1) {
  // Find the desktopLink <a> and add library link before it
  const target = '    <a class="more-item" href="../" id="desktopLink">';
  if (content.indexOf(target) !== -1) {
    const libraryLink = '    <a class="more-item" href="../library.html">\n      <span>\ud83d\udcda</span> <span>\u56fe\u4e66\u9986 / Library</span>\n    </a>\n';
    content = content.replace(target, libraryLink + target);
    console.log('Added library link to mobile index.html');
  } else {
    console.log('Target not found: ' + target.substring(0, 50));
  }
} else {
  console.log('Library link already exists');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done.');
