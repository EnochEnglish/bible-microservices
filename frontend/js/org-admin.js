/**
 * Organization Admin — CRUD for organizations and memberships
 */
(function() {
'use strict';

var API = '/api/v1';
var token = localStorage.getItem('jwt_token') || '';
var state = { orgs: [], currentOrg: null, members: [], domain: '' };

document.addEventListener('DOMContentLoaded', function() {
  if (!token) { window.location.href = '/login.html?redirect=/org-admin.html'; return; }
  loadUser();
  loadOrgs();
  setupTabs();
  setupDomainTabs();
});

function auth() { return { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }; }
function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function loadUser() {
  fetch(API + '/auth/me', { headers: auth() })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (!d.success) { window.location.href = '/login.html?redirect=/org-admin.html'; return; }
      document.getElementById('orgUser').textContent = '👤 ' + (d.user.displayName || d.user.username) + ' (' + d.user.role + ')';
    });
}

// ─── Tabs ───
function setupTabs() {
  document.querySelectorAll('.atab').forEach(function(t) {
    t.addEventListener('click', function() {
      document.querySelectorAll('.atab').forEach(function(b) { b.classList.remove('active'); });
      t.classList.add('active');
      document.querySelectorAll('.atab-content').forEach(function(c) { c.style.display = 'none'; });
      document.getElementById('tab-' + t.dataset.tab).style.display = 'block';
    });
  });
}

function setupDomainTabs() {
  document.querySelectorAll('.domain-tab').forEach(function(t) {
    t.addEventListener('click', function() {
      document.querySelectorAll('.domain-tab').forEach(function(b) { b.classList.remove('active'); });
      t.classList.add('active');
      state.domain = t.dataset.domain;
      renderOrgs();
    });
  });
}

// ─── Organizations ───
function loadOrgs() {
  fetch(API + '/orgs', { headers: auth() })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      state.orgs = data || [];
      renderOrgs();
      populateOrgSelect();
    });
}

function renderOrgs() {
  var filtered = state.domain ? state.orgs.filter(function(o) { return o.domain === state.domain; }) : state.orgs;
  if (!filtered.length) {
    document.getElementById('orgList').innerHTML = '<p style="opacity:0.5;text-align:center;padding:40px">暂无组织，请创建</p>';
    return;
  }
  document.getElementById('orgList').innerHTML = filtered.map(function(o) {
    return '<div class="org-card" onclick="viewOrg(' + o.id + ')">' +
      '<div class="org-name">' + esc(o.name) + (o.nameEn ? ' / ' + esc(o.nameEn) : '') + '</div>' +
      '<div class="org-meta">' +
        '<span>领域: ' + esc(o.domain) + '</span>' +
        '<span>类型: ' + esc(o.type) + '</span>' +
        '<span>成员: ' + o.memberCount + '</span>' +
        (o.location ? '<span>📍 ' + esc(o.location) + '</span>' : '') +
      '</div>' +
      (o.description ? '<div class="org-desc">' + esc(o.description) + '</div>' : '') +
      '<div style="margin-top:8px">' +
        '<button class="btn-edit" onclick="event.stopPropagation();editOrg(' + o.id + ')">编辑</button>' +
        '<button class="btn-delete" onclick="event.stopPropagation();deleteOrg(' + o.id + ')">删除</button>' +
        '<button class="btn-lessons" onclick="event.stopPropagation();viewOrg(' + o.id + ')">成员</button>' +
      '</div></div>';
  }).join('');
}

function viewOrg(id) {
  state.currentOrg = state.orgs.find(function(o) { return o.id === id; });
  document.getElementById('memberOrgSelect').value = id;
  document.querySelector('.atab[data-tab="members"]').click();
  loadMembers();
}

function createOrg() {
  var body = {
    name: document.getElementById('f_name').value,
    nameEn: document.getElementById('f_nameEn').value || null,
    domain: document.getElementById('f_domain').value,
    type: document.getElementById('f_type').value,
    description: document.getElementById('f_desc').value || null,
    location: document.getElementById('f_location').value || null,
    contactEmail: document.getElementById('f_email').value || null,
    contactPhone: document.getElementById('f_phone').value || null,
    logoUrl: document.getElementById('f_logo').value || null
  };
  if (!body.name) { alert('请输入名称'); return; }
  fetch(API + '/orgs', { method: 'POST', headers: auth(), body: JSON.stringify(body) })
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(o) {
      alert('组织已创建: ' + o.name);
      resetForm();
      loadOrgs();
    })
    .catch(function(e) { alert('创建失败: ' + e.message); });
}

function editOrg(id) {
  var o = state.orgs.find(function(x) { return x.id === id; });
  if (!o) return;
  document.getElementById('f_name').value = o.name;
  document.getElementById('f_nameEn').value = o.nameEn || '';
  document.getElementById('f_domain').value = o.domain;
  document.getElementById('f_type').value = o.type;
  document.getElementById('f_desc').value = o.description || '';
  document.getElementById('f_location').value = o.location || '';
  document.getElementById('f_email').value = o.contactEmail || '';
  document.getElementById('f_phone').value = o.contactPhone || '';
  document.getElementById('f_logo').value = o.logoUrl || '';
  document.querySelector('.atab[data-tab="create"]').click();
  // Change button to update
  var btn = document.querySelector('button[onclick="createOrg()"]');
  btn.textContent = '💾 更新';
  btn.onclick = function() { updateOrg(id); };
}

function updateOrg(id) {
  var body = {
    name: document.getElementById('f_name').value,
    nameEn: document.getElementById('f_nameEn').value || null,
    description: document.getElementById('f_desc').value || null,
    location: document.getElementById('f_location').value || null,
    contactEmail: document.getElementById('f_email').value || null,
    contactPhone: document.getElementById('f_phone').value || null,
    logoUrl: document.getElementById('f_logo').value || null
  };
  fetch(API + '/orgs/' + id, { method: 'PUT', headers: auth(), body: JSON.stringify(body) })
    .then(function(r) { return r.json(); })
    .then(function() {
      alert('已更新');
      resetForm();
      loadOrgs();
      var btn = document.querySelector('button[onclick="updateOrg(' + id + ')"]');
      btn.textContent = '💾 创建';
      btn.onclick = function() { createOrg(); };
    });
}

function deleteOrg(id) {
  if (!confirm('删除此组织？所有成员关系将被移除。')) return;
  fetch(API + '/orgs/' + id, { method: 'DELETE', headers: auth() })
    .then(function() { loadOrgs(); });
}

function resetForm() {
  ['f_name','f_nameEn','f_desc','f_location','f_email','f_phone','f_logo'].forEach(function(id) {
    document.getElementById(id).value = '';
  });
  document.getElementById('f_domain').value = 'theology';
  document.getElementById('f_type').value = 'community';
}

// ─── Members ───
function populateOrgSelect() {
  var sel = document.getElementById('memberOrgSelect');
  sel.innerHTML = '<option value="">选择组织...</option>' +
    state.orgs.map(function(o) { return '<option value="' + o.id + '">' + esc(o.name) + '</option>'; }).join('');
}

function loadMembers() {
  var oid = document.getElementById('memberOrgSelect').value;
  if (!oid) {
    document.getElementById('memberList').innerHTML = '';
    document.getElementById('addMemberArea').style.display = 'none';
    return;
  }
  fetch(API + '/orgs/' + oid + '/members', { headers: auth() })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      state.members = data || [];
      renderMembers();
      document.getElementById('addMemberArea').style.display = 'block';
    });
}

function renderMembers() {
  if (!state.members.length) {
    document.getElementById('memberList').innerHTML = '<p style="opacity:0.5;text-align:center;padding:20px">暂无成员</p>';
    return;
  }
  document.getElementById('memberList').innerHTML = state.members.map(function(m) {
    return '<div class="member-row">' +
      '<span class="m-name">' + esc(m.username) + (m.title ? ' (' + esc(m.title) + ')' : '') + '</span>' +
      (m.department ? '<span style="opacity:0.6;font-size:13px">' + esc(m.department) + '</span>' : '') +
      '<span class="m-role role-' + m.orgRole + '">' + m.orgRole + '</span>' +
      '<button class="btn-edit" onclick="editMembership(' + m.id + ',\'' + m.orgRole + '\')">改角色</button>' +
      '<button class="btn-delete" onclick="removeMember(' + m.id + ')">移除</button>' +
    '</div>';
  }).join('');
}

function addMember() {
  var oid = document.getElementById('memberOrgSelect').value;
  var username = document.getElementById('addMemberUsername').value;
  if (!oid || !username) { alert('请选择组织并输入用户名'); return; }

  // First find the user by username — need a lookup API
  // For now, use the admin list users endpoint
  fetch(API + '/auth/admin/users', { headers: auth() })
    .then(function(r) {
      if (!r.ok) throw new Error('无法获取用户列表 (需要管理员权限)');
      return r.json();
    })
    .then(function(data) {
      var user = (data.users || []).find(function(u) { return u.username === username; });
      if (!user) { alert('用户不存在: ' + username); return; }
      var body = {
        userId: user.id,
        orgRole: document.getElementById('addMemberRole').value,
        department: document.getElementById('addMemberDept').value || null,
        title: document.getElementById('addMemberTitle').value || null
      };
      return fetch(API + '/orgs/' + oid + '/members', {
        method: 'POST', headers: auth(), body: JSON.stringify(body)
      });
    })
    .then(function(r) { return r.json(); })
    .then(function() {
      document.getElementById('addMemberUsername').value = '';
      document.getElementById('addMemberDept').value = '';
      document.getElementById('addMemberTitle').value = '';
      loadMembers();
    })
    .catch(function(e) { alert('添加失败: ' + e.message); });
}

function editMembership(mid, currentRole) {
  var newRole = prompt('新角色 (OWNER/ADMIN/TEACHER/STUDENT/LIBRARIAN/MEMBER):', currentRole);
  if (!newRole) return;
  fetch(API + '/orgs/memberships/' + mid, {
    method: 'PUT', headers: auth(),
    body: JSON.stringify({ orgRole: newRole.toUpperCase() })
  })
    .then(function() { loadMembers(); });
}

function removeMember(mid) {
  if (!confirm('移除此成员？')) return;
  fetch(API + '/orgs/memberships/' + mid, { method: 'DELETE', headers: auth() })
    .then(function() { loadMembers(); });
}

// ─── Export ───
window.viewOrg = viewOrg;
window.createOrg = createOrg;
window.editOrg = editOrg;
window.updateOrg = updateOrg;
window.deleteOrg = deleteOrg;
window.resetForm = resetForm;
window.loadMembers = loadMembers;
window.addMember = addMember;
window.editMembership = editMembership;
window.removeMember = removeMember;

})();
