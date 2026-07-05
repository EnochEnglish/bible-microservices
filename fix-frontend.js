// Fix tsk-panel blank space + ensure courses.js redirect uses login page
const fs = require('fs');

// 1. Fix style.css — make .tsk-panel display:none by default
const cssPath = 'D:\\dev\\github\\bible-microservices\\frontend\\css\\style.css';
let css = fs.readFileSync(cssPath, 'utf8');

// Find .tsk-panel { and add display:none if not already there
if (!css.match(/\.tsk-panel\s*\{[^}]*display:none/)) {
  css = css.replace(
    /\.tsk-panel\s*\{/,
    '.tsk-panel {\n  display:none;'
  );
  fs.writeFileSync(cssPath, css, 'utf8');
  console.log('Added display:none to .tsk-panel in style.css');
} else {
  console.log('.tsk-panel already has display:none');
}

// 2. Fix app.js — show tsk-panel when commentaries load, hide when empty
const appJsPath = 'D:\\dev\\github\\bible-microservices\\frontend\\js\\app.js';
let js = fs.readFileSync(appJsPath, 'utf8');

// Find loadCommentaries function and add show/hide logic
// Look for where commentaryTabs is populated
if (!js.includes("tskContent').style.display")) {
  // Add show logic after commentary tabs render
  js = js.replace(
    "document.getElementById('commentaryTabs').innerHTML",
    "document.getElementById('tskContent').style.display = 'block';\n  document.getElementById('commentaryTabs').innerHTML"
  );

  // Add hide logic when no commentaries — look for patterns indicating empty
  // We need to find where it checks if commentaries array is empty
  // Add a check: if no commentaries, hide the panel
  js = js.replace(
    "document.getElementById('commentaryTabs').innerHTML = '';",
    "document.getElementById('commentaryTabs').innerHTML = '';\n  document.getElementById('tskContent').style.display = 'none';"
  );

  fs.writeFileSync(appJsPath, js, 'utf8');
  console.log('Added tsk-panel show/hide logic to app.js');
} else {
  console.log('tsk-panel show/hide logic already in app.js');
}

// 3. Fix courses.js — redirect to login page instead of alert
const coursesJsPath = 'D:\\dev\\github\\bible-microservices\\frontend\\js\\courses.js';
let cjs = fs.readFileSync(coursesJsPath, 'utf8');

// Replace any "window.location.href = '/'" with login redirect
cjs = cjs.replace(
  /window\.location\.href\s*=\s*['"']\/['"']/g,
  "window.location.href = '/login.html?redirect=/courses.html'"
);
fs.writeFileSync(coursesJsPath, cjs, 'utf8');
console.log('Fixed courses.js redirects');

console.log('All fixes done!');
