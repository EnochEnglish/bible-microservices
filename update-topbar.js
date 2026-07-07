// Move library & courses links into the "more" dropdown
const fs = require('fs');
const path = 'D:\\dev\\github\\bible-microservices\\frontend\\index.html';
let html = fs.readFileSync(path, 'utf8');

// 1. Remove the standalone library and courses links from topbar
const libLink = /      <a href="library\.html"[^>]*>.*?<\/a>\n/;
const courseLink = /      <a href="courses\.html"[^>]*>.*?<\/a>\n/;

if (libLink.test(html)) {
  html = html.replace(libLink, '');
  console.log('Removed standalone library link');
} else {
  console.log('ERROR: library link not found');
}

if (courseLink.test(html)) {
  html = html.replace(courseLink, '');
  console.log('Removed standalone courses link');
} else {
  console.log('ERROR: courses link not found');
}

// 2. Add library and courses as dropdown items (at the top of the dropdown, before 灵修)
const dropdownItems = `          <a class="dropdown-item" href="library.html" style="text-decoration:none;color:inherit;">📚 <span data-zh="图书馆" data-en="Library">图书馆</span></a>
          <a class="dropdown-item" href="courses.html" style="text-decoration:none;color:inherit;">📖 <span data-zh="在线课程" data-en="Courses">在线课程</span></a>
          <div class="dropdown-divider"></div>
`;

// Insert before the first dropdown item (灵修)
const firstDropdown = /          <button class="dropdown-item" onclick="openDevotionPanel/;
if (firstDropdown.test(html)) {
  html = html.replace(firstDropdown, dropdownItems + '          <button class="dropdown-item" onclick="openDevotionPanel');
  console.log('Added library & courses to dropdown');
} else {
  console.log('ERROR: dropdown insertion point not found');
}

// 3. Update version
html = html.replace(/v=2026070\d[a-z]/g, 'v=20260707b');
console.log('Version updated to v=20260707b');

fs.writeFileSync(path, html, 'utf8');
console.log('Done!');
