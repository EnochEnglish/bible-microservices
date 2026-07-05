// Add org-admin link to index.html topbar + ensure login page works
const fs = require('fs');

// Update index.html — add org-admin link in more dropdown
const indexPath = 'D:\\dev\\github\\bible-microservices\\frontend\\index.html';
let html = fs.readFileSync(indexPath, 'utf8');

if (!html.includes('org-admin.html')) {
  // Add org-admin link after admin.html in the dropdown
  html = html.replace(
    '<a class="dropdown-item" id="topbarAdminBtn" href="admin.html" target="_blank" style="text-decoration:none;color:inherit;display:none;">⚙️ <span data-zh="用户管理" data-en="Admin">用户管理</span></a>',
    '<a class="dropdown-item" id="topbarAdminBtn" href="admin.html" target="_blank" style="text-decoration:none;color:inherit;display:none;">⚙️ <span data-zh="用户管理" data-en="Admin">用户管理</span></a>\n          <a class="dropdown-item" href="org-admin.html" target="_blank" style="text-decoration:none;color:inherit;">🏛️ <span data-zh="组织管理" data-en="Organizations">组织管理</span></a>'
  );
  console.log('Added org-admin link to index.html dropdown');
}

// Update version
html = html.replace(/v=20260705a/g, 'v=20260705b');
fs.writeFileSync(indexPath, html, 'utf8');
console.log('index.html updated');

// Check if login.html exists (should be created by subagent)
try {
  fs.accessSync('D:\\dev\\github\\bible-microservices\\frontend\\login.html');
  console.log('login.html exists (created by subagent)');
} catch {
  console.log('login.html NOT found — will need to create it');
}

// Check course-admin.js redirect fix
const caPath = 'D:\\dev\\github\\bible-microservices\\frontend\\js\\course-admin.js';
let ca = fs.readFileSync(caPath, 'utf8');
if (ca.includes("window.location.href = '/'")) {
  ca = ca.replace("window.location.href = '/'", "window.location.href = '/login.html?redirect=/course-admin.html'");
  fs.writeFileSync(caPath, ca, 'utf8');
  console.log('Fixed course-admin.js redirect to login page');
} else {
  console.log('course-admin.js redirect already fixed or different pattern');
}

console.log('Done!');
