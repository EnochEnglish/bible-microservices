// Precise fix for app.js — show/hide tsk-panel
const fs = require('fs');
const path = 'D:\\dev\\github\\bible-microservices\\frontend\\js\\app.js';
let js = fs.readFileSync(path, 'utf8');

// Fix 1: In loadCommentaries success path — show tskContent
// The success path is: apiGet(...).then(function(data) { state.commentaries = data; renderCommentaryTabs(); renderCommentaryBody(); })
js = js.replace(
  "state.commentaries = data;\n    renderCommentaryTabs();\n    renderCommentaryBody();",
  "state.commentaries = data;\n    var tskEl = document.getElementById('tskContent');\n    if (tskEl) tskEl.style.display = 'block';\n    renderCommentaryTabs();\n    renderCommentaryBody();"
);

// Fix 2: In loadCommentaries error path — hide tskContent
js = js.replace(
  "state.commentaries = null;\n    renderCommentaryTabs();\n    body.innerHTML = '<div class=\"empty-state\">' + t(\"noCommentary\") + '</div>';",
  "state.commentaries = null;\n    var tskEl2 = document.getElementById('tskContent');\n    if (tskEl2) tskEl2.style.display = 'none';\n    renderCommentaryTabs();\n    body.innerHTML = '<div class=\"empty-state\">' + t(\"noCommentary\") + '</div>';"
);

fs.writeFileSync(path, js, 'utf8');
console.log('app.js tsk-panel show/hide logic added');

// Verify
const verify = fs.readFileSync(path, 'utf8');
if (verify.includes("tskEl.style.display = 'block'") && verify.includes("tskEl2.style.display = 'none'")) {
  console.log('Verified: both show and hide logic present');
} else {
  console.log('ERROR: logic not found after write');
}
