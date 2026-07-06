/**
 * System Settings — domains, org types, roles, user management
 */
(function() {
'use strict';

var API = '/api/v1';
var token = localStorage.getItem('jwt_token') || '';

document.addEventListener('DOMContentLoaded', function() {
  if (!token) { window.location.href = '/login.html?redirect=/settings.html'; return; }
  loadUser();
  loadAll();
  setupTabs();
});

function auth() { return { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }; }
function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function loadUser() {
  fetch(API + '/auth/me', { headers: auth() })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (!d.success) { window.location.href = '/login.html?redirect=/settings.html'; return; }
      document.getElementById('settingsUser').textContent = '👤 ' + (d.user.displayName || d.user.username) + ' (' + d.user.role + ')';
      if (d.user.role !== 'ADMIN') {
        // Non-admin can view but not edit
        document.querySelectorAll('.btn-primary').forEach(function(b) { b.style.display = 'none'; });
      }
    });
}

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

function loadAll() {
  // System info
  fetch(API + '/settings/info').then(function(r) { return r.json(); }).then(function(info) {
    document.getElementById('systemInfo').innerHTML =
      '<div class="info-card"><div class="logo">📖</div><div class="info">' +
      '<h1>' + esc(info.nameZh) + ' / ' + esc(info.name) + '</h1>' +
      '<p>版本: ' + esc(info.version) + '</p></div></div>';

    document.getElementById('featureList').innerHTML = info.features.map(function(f) {
      return '<div class="setting-item"><span class="icon">✅</span><div class="label"><div class="zh">' + esc(f) + '</div></div></div>';
    }).join('');
  });

  // Domains
  fetch(API + '/settings/domains').then(function(r) { return r.json(); }).then(function(items) {
    document.getElementById('domainList').innerHTML = items.map(function(d) {
      return '<div class="setting-item"><span class="icon">' + (d.icon||'📚') + '</span>' +
        '<div class="label"><div class="zh">' + esc(d.labelZh) + '</div><div class="en">' + esc(d.labelEn) + '</div></div>' +
        '<span class="value">' + esc(d.value) + '</span></div>';
    }).join('');
  });

  // Org types
  fetch(API + '/settings/org-types').then(function(r) { return r.json(); }).then(function(items) {
    document.getElementById('orgTypeList').innerHTML = items.map(function(d) {
      return '<div class="setting-item"><span class="icon">🏛️</span>' +
        '<div class="label"><div class="zh">' + esc(d.labelZh) + '</div><div class="en">' + esc(d.labelEn) + '</div></div>' +
        '<span class="value">' + esc(d.value) + '</span></div>';
    }).join('');
  });

  // Org roles
  fetch(API + '/settings/org-roles').then(function(r) { return r.json(); }).then(function(items) {
    document.getElementById('orgRoleList').innerHTML = items.map(function(d) {
      return '<div class="setting-item"><span class="icon">👤</span>' +
        '<div class="label"><div class="zh">' + esc(d.labelZh) + ' (Level ' + esc(d.level) + ')</div><div class="en">' + esc(d.labelEn) + '</div></div>' +
        '<span class="value">' + esc(d.value) + '</span></div>';
    }).join('');
  });

  // System roles
  fetch(API + '/settings/system-roles').then(function(r) { return r.json(); }).then(function(items) {
    document.getElementById('sysRoleList').innerHTML = items.map(function(d) {
      return '<div class="setting-item"><span class="icon">🔐</span>' +
        '<div class="label"><div class="zh">' + esc(d.labelZh) + '</div><div class="en">' + esc(d.labelEn) + '</div></div>' +
        '<span class="value">' + esc(d.value) + '</span></div>';
    }).join('');
  });

  // Users
  loadUsers();
}

function loadUsers() {
  fetch(API + '/auth/admin/users', { headers: auth() })
    .then(function(r) {
      if (!r.ok) {
        document.getElementById('userList').innerHTML = '<p style="opacity:0.5">需要管理员权限查看用户列表</p>';
        return null;
      }
      return r.json();
    })
    .then(function(data) {
      if (!data) return;
      var users = data.users || [];
      document.getElementById('userList').innerHTML = users.map(function(u) {
        return '<div class="setting-item">' +
          '<span class="icon">' + (u.role === 'ADMIN' ? '👑' : u.role === 'TEACHER' ? '🎓' : '👤') + '</span>' +
          '<div class="label"><div class="zh">' + esc(u.username) + (u.displayName ? ' (' + esc(u.displayName) + ')' : '') + '</div>' +
          '<div class="en">ID: ' + u.id + ' | ' + esc(u.role) + (u.enabled ? '' : ' | DISABLED') + '</div></div>' +
          '<select onchange="changeRole(' + u.id + ',this.value)" style="padding:4px 8px;background:var(--bg);border:1px solid var(--border);border-radius:4px;color:var(--text)">' +
          '<option value="USER"' + (u.role==='USER'?' selected':'') + '>普通用户</option>' +
          '<option value="TEACHER"' + (u.role==='TEACHER'?' selected':'') + '>教师</option>' +
          '<option value="ADMIN"' + (u.role==='ADMIN'?' selected':'') + '>管理员</option>' +
          '</select>' +
          '<button class="btn-edit" onclick="resetPassword(' + u.id + ')">重置密码</button>' +
          '<button class="btn-delete" onclick="toggleEnabled(' + u.id + ',' + (u.enabled?'false':'true') + ')">' + (u.enabled?'禁用':'启用') + '</button>' +
        '</div>';
      }).join('');
    });
}

function createUser() {
  var username = document.getElementById('newUsername').value.trim();
  var password = document.getElementById('newPassword').value;
  var role = document.getElementById('newRole').value;
  if (!username || !password) { alert('请输入用户名和密码'); return; }
  fetch(API + '/auth/admin/users', {
    method: 'POST', headers: auth(),
    body: JSON.stringify({ username: username, password: password, role: role })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d.success) {
      document.getElementById('newUsername').value = '';
      document.getElementById('newPassword').value = '';
      loadUsers();
    } else {
      alert(d.message || '创建失败');
    }
  });
}

function changeRole(userId, newRole) {
  fetch(API + '/auth/admin/users/' + userId + '/role', {
    method: 'PUT', headers: auth(),
    body: JSON.stringify({ role: newRole })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    if (d.success) { loadUsers(); } else { alert(d.message); }
  });
}

function resetPassword(userId) {
  var newPwd = prompt('输入新密码 (≥3字符):');
  if (!newPwd) return;
  fetch(API + '/auth/admin/users/' + userId + '/reset-password', {
    method: 'POST', headers: auth(),
    body: JSON.stringify({ newPassword: newPwd })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) { alert(d.message); });
}

function toggleEnabled(userId, enable) {
  fetch(API + '/auth/admin/users/' + userId + '/toggle', {
    method: 'POST', headers: auth()
  })
  .then(function(r) { return r.json(); })
  .then(function(d) { if (d.success) loadUsers(); else alert(d.message); });
}

window.createUser = createUser;
window.changeRole = changeRole;
window.resetPassword = resetPassword;
window.toggleEnabled = toggleEnabled;

})();
