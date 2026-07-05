// Update courses.html — add domain tabs + admin link
const fs = require('fs');
const path = 'D:\\dev\\github\\bible-microservices\\frontend\\courses.html';
let html = fs.readFileSync(path, 'utf8');

// Add domain tabs after course-filters
html = html.replace(
  '<div class="course-filters">',
  '<div class="domain-tabs">\n' +
  '      <button class="domain-tab active" data-domain="">🌐 全部 / All</button>\n' +
  '      <button class="domain-tab" data-domain="theology">✝️ 神学</button>\n' +
  '      <button class="domain-tab" data-domain="english">📖 英语</button>\n' +
  '      <button class="domain-tab" data-domain="cs">💻 计算机</button>\n' +
  '      <button class="domain-tab" data-domain="university">🎓 大学</button>\n' +
  '    </div>\n' +
  '    <div class="course-filters">'
);

// Add admin link in topbar-right
html = html.replace(
  '<span id="courseUserArea"></span>',
  '<span id="courseUserArea"></span>\n' +
  '      <a href="/course-admin.html" id="adminLink" style="display:none;margin-left:12px;color:var(--text)">⚙️ 管理</a>'
);

// Update version
html = html.replace(/v=20260704a/g, 'v=20260705a');

fs.writeFileSync(path, html, 'utf8');
console.log('courses.html updated');

// Update courses.js — add domain filter + admin detection
const jsPath = 'D:\\dev\\github\\bible-microservices\\frontend\\js\\courses.js';
let js = fs.readFileSync(jsPath, 'utf8');

// Add domain to state
js = js.replace(
  "filter: ''",
  "filter: '',\n  domain: ''"
);

// Update loadCourses to support domain
js = js.replace(
  "function loadCourses() {\n  fetch(API + '/courses')",
  "function loadCourses() {\n  var url = API + '/courses';\n  if (state.domain) url += '?domain=' + encodeURIComponent(state.domain);\n  fetch(url)"
);

// Update renderCourseGrid to also filter by domain client-side
js = js.replace(
  "var filtered = state.filter\n    ? state.courses.filter(function(c) { return c.category === state.filter; })\n    : state.courses;",
  "var filtered = state.courses;\n  if (state.filter) filtered = filtered.filter(function(c) { return c.category === state.filter; });\n  if (state.domain) filtered = filtered.filter(function(c) { return c.domain === state.domain; });"
);

// Add domain tab handler after the filter button click handler
js = js.replace(
  "// ─── Course Detail ───",
  "// Domain tabs\nif (document.querySelector('.domain-tab')) {\n  document.querySelectorAll('.domain-tab').forEach(function(t) {\n    t.addEventListener('click', function() {\n      document.querySelectorAll('.domain-tab').forEach(function(b) { b.classList.remove('active'); });\n      t.classList.add('active');\n      state.domain = t.dataset.domain;\n      loadCourses();\n    });\n  });\n}\n\n// ─── Course Detail ───"
);

// Update renderUserArea to show admin link for ADMIN/TEACHER
js = js.replace(
  "if (state.user.role === 'TEACHER' || state.user.role === 'ADMIN') {\n    el.innerHTML += ' <a href=\"#grading\" onclick=\"showGrading()\" style=\"margin-left:8px\">评分</a>';\n  }",
  "if (state.user.role === 'TEACHER' || state.user.role === 'ADMIN') {\n    el.innerHTML += ' <a href=\"#grading\" onclick=\"showGrading()\" style=\"margin-left:8px\">评分</a>';\n    var al = document.getElementById('adminLink');\n    if (al) al.style.display = 'inline';\n  }"
);

// Update version in courses.js (not needed, version is in HTML)
fs.writeFileSync(jsPath, js, 'utf8');
console.log('courses.js updated');
console.log('Done!');
