// Comprehensive fix script
const fs = require('fs');

// ═══ 1. Fix tsk-panel blank space ═══
const cssPath = 'D:\\dev\\github\\bible-microservices\\frontend\\css\\style.css';
let css = fs.readFileSync(cssPath, 'utf8');

// Add display:none to .tsk-panel
if (!css.match(/\.tsk-panel\s*\{[^}]*display\s*:\s*none/)) {
  css = css.replace(
    /\.tsk-panel\s*\{/,
    '.tsk-panel {\n  display:none;'
  );
  console.log('1. Added display:none to .tsk-panel');
} else {
  console.log('1. .tsk-panel already has display:none');
}

// Add a rule: when tsk-panel is hidden, #app uses 2-column grid
if (!css.includes('#app.no-commentary')) {
  css = css.replace(
    /(#app\s*\{[^}]*\})/,
    `$1\n#app.no-commentary {\n  grid-template-columns:200px 1fr;\n}`
  );
  console.log('1b. Added #app.no-commentary 2-column rule');
}

fs.writeFileSync(cssPath, css, 'utf8');

// ═══ 2. Fix app.js — show/hide tsk-panel + add no-commentary class ═══
const appJsPath = 'D:\\dev\\github\\bible-microservices\\frontend\\js\\app.js';
let js = fs.readFileSync(appJsPath, 'utf8');

// Replace loadCommentaries to use class-based show/hide
js = js.replace(
  "var tskEl = document.getElementById('tskContent');\n    if (tskEl) tskEl.style.display = 'block';",
  "var tskEl = document.getElementById('tskContent');\n    if (tskEl) { tskEl.style.display = 'block'; document.getElementById('app').classList.remove('no-commentary'); }"
);

js = js.replace(
  "var tskEl2 = document.getElementById('tskContent');\n    if (tskEl2) tskEl2.style.display = 'none';",
  "var tskEl2 = document.getElementById('tskContent');\n    if (tskEl2) { tskEl2.style.display = 'none'; document.getElementById('app').classList.add('no-commentary'); }"
);

fs.writeFileSync(appJsPath, js, 'utf8');
console.log('2. app.js tsk-panel show/hide + no-commentary class updated');

// ═══ 3. Add login state visibility for org-admin & settings in index.html ═══
const htmlPath = 'D:\\dev\\github\\bible-microservices\\frontend\\index.html';
let html = fs.readFileSync(htmlPath, 'utf8');

// Add id and style display:none to org-admin and settings links
html = html.replace(
  '<a class="dropdown-item" href="org-admin.html" target="_blank" style="text-decoration:none;color:inherit;">🏛️',
  '<a class="dropdown-item" id="orgAdminLink" href="org-admin.html" target="_blank" style="text-decoration:none;color:inherit;display:none;">🏛️'
);

html = html.replace(
  '<a class="dropdown-item" href="settings.html" target="_blank" style="text-decoration:none;color:inherit;">⚙️',
  '<a class="dropdown-item" id="settingsLink" href="settings.html" target="_blank" style="text-decoration:none;color:inherit;display:none;">⚙️'
);

// Add logout button in dropdown (after login button)
if (!html.includes('id="topbarLogoutBtn"')) {
  html = html.replace(
    '<button class="dropdown-item" id="topbarLoginBtn" onclick="openAuthPanel(); closeTopbarDropdown();">👤 <span data-zh="登录" data-en="Login">登录</span></button>',
    '<button class="dropdown-item" id="topbarLoginBtn" onclick="openAuthPanel(); closeTopbarDropdown();">👤 <span data-zh="登录" data-en="Login">登录</span></button>\n          <button class="dropdown-item" id="topbarLogoutBtn" onclick="doLogoutFromTopbar(); closeTopbarDropdown();" style="display:none;">🚪 <span data-zh="退出登录" data-en="Logout">退出登录</span></button>'
  );
}

// Update version
html = html.replace(/v=20260705c/g, 'v=20260706a');
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('3. index.html: org-admin/settings hidden by default, logout button added');

// ═══ 4. Add doLogoutFromTopbar + login state visibility logic to app.js ═══
if (!js.includes('doLogoutFromTopbar')) {
  // Find a good insertion point — after updateLoginButton function or at the end
  // Add at the end of the file
  js += `
// ═══════════════════════════════════════════
//  TOPBAR LOGIN STATE VISIBILITY
// ═══════════════════════════════════════════
function updateTopbarAuthState() {
  var token = localStorage.getItem('jwt_token');
  var loginBtn = document.getElementById('topbarLoginBtn');
  var logoutBtn = document.getElementById('topbarLogoutBtn');
  var orgAdminLink = document.getElementById('orgAdminLink');
  var settingsLink = document.getElementById('settingsLink');
  var adminBtn = document.getElementById('topbarAdminBtn');
  
  if (token) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = '';
    if (orgAdminLink) orgAdminLink.style.display = '';
    if (settingsLink) settingsLink.style.display = '';
  } else {
    if (loginBtn) loginBtn.style.display = '';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (orgAdminLink) orgAdminLink.style.display = 'none';
    if (settingsLink) settingsLink.style.display = 'none';
  }
}

function doLogoutFromTopbar() {
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('user_info');
  updateTopbarAuthState();
  // Reload to reset state
  location.reload();
}

// Call on page load
document.addEventListener('DOMContentLoaded', function() {
  updateTopbarAuthState();
});
`;
  fs.writeFileSync(appJsPath, js, 'utf8');
  console.log('4. app.js: updateTopbarAuthState + doLogoutFromTopbar added');
}

// ═══ 5. Also add no-commentary class to #app in index.html by default ═══
html = fs.readFileSync(htmlPath, 'utf8');
html = html.replace('<div id="app">', '<div id="app" class="no-commentary">');
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('5. index.html: #app has no-commentary class by default');

console.log('\\nAll fixes done!');
