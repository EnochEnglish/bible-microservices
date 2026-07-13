/**
 * plugin-menu.js — 动态插件菜单注入
 * 
 * 从后端 /api/v1/plugins 获取启用的插件列表，
 * 自动在 topbar 下拉菜单中渲染入口。
 * 
 * 不修改任何现有 HTML/JS 文件，仅在 DOMContentLoaded 时执行。
 */
(function() {
  'use strict';

  var API_URL = '/api/v1/plugins';
  var MENU_CONTAINER_ID = 'moreDropdown';
  var INJECTED_FLAG = 'data-plugins-injected';

  /**
   * 获取当前用户角色（从 localStorage JWT 解析）
   */
  function getUserRole() {
    try {
      var token = localStorage.getItem('bible_token') || localStorage.getItem('jwt_token');
      if (!token) return 'USER';
      var parts = token.split('.');
      if (parts.length < 2) return 'USER';
      var payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      var role = payload.role || payload.roles || 'USER';
      if (Array.isArray(role)) role = role[0] || 'USER';
      return String(role).replace('ROLE_', '');
    } catch (e) {
      return 'USER';
    }
  }

  /**
   * 角色优先级：ADMIN > TEACHER > USER
   */
  var ROLE_LEVEL = { 'ADMIN': 3, 'TEACHER': 2, 'USER': 1 };
  function hasRole(required, current) {
    return (ROLE_LEVEL[current] || 0) >= (ROLE_LEVEL[required] || 0);
  }

  /**
   * 渲染插件菜单项
   */
  function renderPlugins(plugins) {
    var container = document.getElementById(MENU_CONTAINER_ID);
    if (!container) return;
    if (container.hasAttribute(INJECTED_FLAG)) return; // 防止重复注入

    var userRole = getUserRole();
    var visiblePlugins = plugins.filter(function(p) {
      return hasRole(p.requiredRole, userRole);
    });

    if (visiblePlugins.length === 0) return;

    // 插入分隔线
    var divider = document.createElement('div');
    divider.className = 'dropdown-divider';
    divider.setAttribute('data-plugin-divider', 'true');
    container.appendChild(divider);

    // 渲染每个插件
    visiblePlugins.forEach(function(p) {
      var a = document.createElement('a');
      a.className = 'dropdown-item plugin-menu-item';
      a.href = p.entryUrl;
      a.dataset.pluginCode = p.code;
      if (p.openInNewTab) a.target = '_blank';
      a.style.textDecoration = 'none';
      a.style.color = 'inherit';

      var icon = p.icon || '🔌';
      var nameZh = p.nameZh || p.code;
      var nameEn = p.nameEn || nameZh;

      a.innerHTML = icon + ' <span data-zh="' + escAttr(nameZh) + '" data-en="' + escAttr(nameEn) + '">' + escHtml(nameZh) + '</span>';
      container.appendChild(a);
    });

    container.setAttribute(INJECTED_FLAG, 'true');

    // 触发语言标签刷新（复用现有 applyLanguageLabels 机制）
    if (typeof applyLanguageLabels === 'function') {
      applyLanguageLabels();
    } else if (typeof refreshLabels === 'function') {
      refreshLabels();
    }
  }

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escAttr(s) {
    return escHtml(s);
  }

  /**
   * 加载插件列表并渲染
   */
  function loadPluginMenu() {
    fetch(API_URL)
      .then(function(r) { return r.json(); })
      .then(function(plugins) {
        if (Array.isArray(plugins) && plugins.length > 0) {
          renderPlugins(plugins);
        }
      })
      .catch(function(e) {
        console.warn('[plugin-menu] Failed to load plugins:', e);
      });
  }

  // 等 DOM 就绪后执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      // 延迟 200ms 确保其他初始化完成
      setTimeout(loadPluginMenu, 200);
    });
  } else {
    setTimeout(loadPluginMenu, 200);
  }
})();
