// Update settings.js to add domain CRUD UI
const fs = require('fs');
const path = 'D:\\dev\\github\\bible-microservices\\frontend\\js\\settings.js';
let js = fs.readFileSync(path, 'utf8');

// Replace the domains load section to include edit/delete buttons and add form
const oldDomainsLoad = `  // Domains
  fetch(API + '/settings/domains').then(function(r) { return r.json(); }).then(function(items) {
    document.getElementById('domainList').innerHTML = items.map(function(d) {
      return '<div class="setting-item"><span class="icon">' + (d.icon||'📚') + '</span>' +
        '<div class="label"><div class="zh">' + esc(d.labelZh) + '</div><div class="en">' + esc(d.labelEn) + '</div></div>' +
        '<span class="value">' + esc(d.value) + '</span></div>';
    }).join('');
  });`;

const newDomainsLoad = `  // Domains (with CRUD)
  loadDomains();`;

if (js.includes(oldDomainsLoad)) {
  js = js.replace(oldDomainsLoad, newDomainsLoad);
  console.log('Replaced domains load section');
} else {
  console.log('ERROR: Could not find domains load section');
  console.log('Searching for partial match...');
  const idx = js.indexOf("loadDomains()");
  console.log('loadDomains already exists at index:', idx);
}

// Add loadDomains + CRUD functions before the window exports
const crudFunctions = `
// ═══ Domain CRUD ═══
function loadDomains() {
  fetch(API + '/settings/domains').then(function(r) { return r.json(); }).then(function(items) {
    var html = items.map(function(d) {
      return '<div class="setting-item" id="domain-row-' + d.id + '">' +
        '<span class="icon">' + (d.icon||'📚') + '</span>' +
        '<div class="label">' +
          '<div class="zh">' + esc(d.labelZh) + '</div>' +
          '<div class="en">' + esc(d.labelEn) + ' <code style="opacity:0.5">(' + esc(d.value) + ')</code></div>' +
        '</div>' +
        '<button class="btn-edit" onclick="editDomain(' + d.id + ',\\'' + esc(d.value) + '\\',\\'' + esc(d.labelZh) + '\\',\\'' + esc(d.labelEn||'') + '\\',\\'' + esc(d.icon||'') + '\\')">编辑</button>' +
        '<button class="btn-delete" onclick="deleteDomain(' + d.id + ')">删除</button>' +
      '</div>';
    }).join('');
    // Add create form
    html += '<div class="setting-item domain-create-form" style="border-top:1px dashed var(--border);margin-top:8px;padding-top:12px">' +
      '<input id="newDomainValue" placeholder="value (english)" style="width:120px;padding:4px 8px;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text)">' +
      '<input id="newDomainZh" placeholder="中文名" style="width:100px;padding:4px 8px;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text)">' +
      '<input id="newDomainEn" placeholder="English" style="width:120px;padding:4px 8px;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text)">' +
      '<input id="newDomainIcon" placeholder="icon" style="width:50px;padding:4px 8px;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text)">' +
      '<button class="btn-primary" onclick="createDomain()">+ 添加领域</button>' +
    '</div>';
    document.getElementById('domainList').innerHTML = html;
  });
}

function createDomain() {
  var value = document.getElementById('newDomainValue').value.trim();
  var labelZh = document.getElementById('newDomainZh').value.trim();
  var labelEn = document.getElementById('newDomainEn').value.trim();
  var icon = document.getElementById('newDomainIcon').value.trim();
  if (!value || !labelZh) { alert('value 和中文名为必填'); return; }
  fetch(API + '/settings/domains', {
    method: 'POST', headers: auth(),
    body: JSON.stringify({ value: value, labelZh: labelZh, labelEn: labelEn, icon: icon })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d.ok) { loadDomains(); }
    else { alert(d.message || '创建失败'); }
  });
}

function editDomain(id, value, labelZh, labelEn, icon) {
  var newZh = prompt('中文名:', labelZh);
  if (newZh === null) return;
  var newEn = prompt('English:', labelEn);
  if (newEn === null) return;
  var newIcon = prompt('Icon (emoji):', icon);
  if (newIcon === null) return;
  fetch(API + '/settings/domains/' + id, {
    method: 'PUT', headers: auth(),
    body: JSON.stringify({ labelZh: newZh, labelEn: newEn, icon: newIcon })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d.ok) { loadDomains(); } else { alert(d.message || '更新失败'); }
  });
}

function deleteDomain(id) {
  if (!confirm('确认删除此领域？已有课程不受影响。')) return;
  fetch(API + '/settings/domains/' + id, {
    method: 'DELETE', headers: auth()
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d.ok) { loadDomains(); } else { alert(d.message || '删除失败'); }
  });
}

`;

// Insert before window exports
const windowExportIdx = js.indexOf('window.createUser');
if (windowExportIdx > 0) {
  js = js.slice(0, windowExportIdx) + crudFunctions + js.slice(windowExportIdx);
  console.log('Inserted CRUD functions');
} else {
  console.log('ERROR: Could not find window.createUser');
}

// Add window exports for new functions
const newExports = 'window.createDomain = createDomain;\nwindow.editDomain = editDomain;\nwindow.deleteDomain = deleteDomain;\n';
js = js.replace('window.toggleEnabled = toggleEnabled;', 'window.toggleEnabled = toggleEnabled;\n' + newExports.trim());

fs.writeFileSync(path, js, 'utf8');
console.log('Done! settings.js updated with domain CRUD');
