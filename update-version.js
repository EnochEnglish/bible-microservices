// Add settings link to index.html + update version
const fs = require('fs');
const path = 'D:\\dev\\github\\bible-microservices\\frontend\\index.html';
let html = fs.readFileSync(path, 'utf8');

// Add settings link after org-admin in dropdown
if (!html.includes('settings.html')) {
  html = html.replace(
    '<a class="dropdown-item" href="org-admin.html" target="_blank" style="text-decoration:none;color:inherit;">🏛️ <span data-zh="组织管理" data-en="Organizations">组织管理</span></a>',
    '<a class="dropdown-item" href="org-admin.html" target="_blank" style="text-decoration:none;color:inherit;">🏛️ <span data-zh="组织管理" data-en="Organizations">组织管理</span></a>\n          <a class="dropdown-item" href="settings.html" target="_blank" style="text-decoration:none;color:inherit;">⚙️ <span data-zh="系统设置" data-en="Settings">系统设置</span></a>'
  );
  console.log('Added settings link');
}

// Update version
html = html.replace(/v=20260705[bc]/g, 'v=20260705c');
fs.writeFileSync(path, html, 'utf8');
console.log('index.html updated to v=20260705c');
