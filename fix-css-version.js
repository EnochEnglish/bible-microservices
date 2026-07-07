// Fix 3 issues: 1) commentary panel overflow 2) domain CRUD backend+frontend
const fs = require('fs');

// ═══ 1. Fix .tsk-panel width overflow ═══
const cssPath = 'D:\\dev\\github\\bible-microservices\\frontend\\css\\style.css';
let css = fs.readFileSync(cssPath, 'utf8');

// Remove fixed width:640px from .tsk-panel
css = css.replace(/\.tsk-panel\s*\{\s*width:\s*640px;\s*\}/, '.tsk-panel { width:100%; min-width:0; }');
console.log('1a. Removed .tsk-panel width:640px -> width:100%');

// Also ensure #commentaryBody doesn't overflow
if (!css.includes('#commentaryBody { max-width:100%')) {
  css = css.replace(
    /#commentaryBody\s*\{[^}]*max-height:calc\(100vh - 200px\);/,
    '#commentaryBody {\n  max-width:100%; overflow-x:hidden;\n  max-height:calc(100vh - 200px);'
  );
  console.log('1b. Added #commentaryBody max-width:100%');
}

// Ensure .tsk-panel has overflow-x:hidden
if (!css.match(/\.tsk-panel\s*\{[^}]*overflow-x:hidden/)) {
  css = css.replace(
    /\.tsk-panel\s*\{\s*background:var\(--bg2\)/,
    '.tsk-panel {\n  overflow-x:hidden;\n  background:var(--bg2)'
  );
  console.log('1c. Added .tsk-panel overflow-x:hidden');
}

fs.writeFileSync(cssPath, css, 'utf8');

// ═══ 2. Update version in index.html and courses.html ═══
const indexPath = 'D:\\dev\\github\\bible-microservices\\frontend\\index.html';
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/v=2026070\d[a-z]/g, 'v=20260707a');
fs.writeFileSync(indexPath, html, 'utf8');
console.log('2. index.html version -> v=20260707a');

const coursesPath = 'D:\\dev\\github\\bible-microservices\\frontend\\courses.html';
let cHtml = fs.readFileSync(coursesPath, 'utf8');
cHtml = cHtml.replace(/v=2026070\d[a-z]/g, 'v=20260707a');
fs.writeFileSync(coursesPath, cHtml, 'utf8');
console.log('2b. courses.html version -> v=20260707a');

console.log('\nCSS + HTML fixes done!');
