// Update index.html — add courses domain tabs CSS + ensure admin link
const fs = require('fs');
const indexPath = 'D:\\dev\\github\\bible-microservices\\frontend\\index.html';
let html = fs.readFileSync(indexPath, 'utf8');

// Check if courses link already exists in topbar
if (!html.includes('courses.html')) {
  console.log('WARNING: courses.html link not found in index.html topbar');
} else {
  console.log('courses.html link already present');
}

// Add domain-tabs CSS link to courses.html (already done)
// Add course-admin CSS to index.html head if not present
if (!html.includes('course-admin.css')) {
  html = html.replace(
    '</head>',
    '  <link rel="stylesheet" href="/css/course-admin.css?v=20260705a">\n</head>'
  );
  console.log('Added course-admin.css to index.html');
}

// Update version numbers
html = html.replace(/v=20260704a/g, 'v=20260705a');
fs.writeFileSync(indexPath, html, 'utf8');
console.log('index.html updated');

// Also update courses.html version (already done by first script, but double-check)
const coursesPath = 'D:\\dev\\github\\bible-microservices\\frontend\\courses.html';
let coursesHtml = fs.readFileSync(coursesPath, 'utf8');
coursesHtml = coursesHtml.replace(/v=20260704a/g, 'v=20260705a');
fs.writeFileSync(coursesPath, coursesHtml, 'utf8');
console.log('courses.html version updated');

// Add domain-tabs CSS to courses.css
const coursesCssPath = 'D:\\dev\\github\\bible-microservices\\frontend\\css\\courses.css';
let css = fs.readFileSync(coursesCssPath, 'utf8');
if (!css.includes('.domain-tabs')) {
  css += '\n\n/* Domain Tabs */\n.domain-tabs{display:flex;gap:4px;padding:12px 24px 0;max-width:1200px;margin:0 auto}\n.domain-tab{background:none;border:1px solid var(--border,#2a2d3a);color:var(--text,#e4e6f0);opacity:0.6;padding:6px 16px;border-radius:20px;cursor:pointer;font-size:13px}\n.domain-tab.active{opacity:1;border-color:#4a9eff;background:rgba(74,158,255,0.1)}\n.domain-tab:hover{opacity:0.9}\n';
  fs.writeFileSync(coursesCssPath, css, 'utf8');
  console.log('Added domain-tabs CSS to courses.css');
}

// Update mobile.js and mobile.css versions
const mobileHtmlPath = 'D:\\dev\\github\\bible-microservices\\frontend\\m\\index.html';
let mHtml = fs.readFileSync(mobileHtmlPath, 'utf8');
mHtml = mHtml.replace(/v=20260704a/g, 'v=20260705a');
fs.writeFileSync(mobileHtmlPath, mHtml, 'utf8');
console.log('mobile index.html version updated');

console.log('All done!');
