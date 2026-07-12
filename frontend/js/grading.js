/**
 * grading.js — 教师阅卷模块
 * Teacher Grading Module — view pending gradings, score subjective answers
 *
 * 功能:
 * 1. 教师查看待阅卷列表
 * 2. 每道主观题显示学生答案、参考答案、打分输入、批注输入
 * 3. 提交评分后更新学生成绩
 * 4. 显示全班成绩分布
 *
 * 依赖: 无外部依赖，纯独立模块
 */
(function() {
'use strict';

var API = '/api/v1';
var GRADING_STATE = {
  token: localStorage.getItem('jwt_token') || '',
  user: null,
  pendingGradings: [],
  currentGradingView: 'list', // 'list' | 'detail' | 'stats'
  allResults: [],
  currentExamId: null
};

// ─── Init ───
document.addEventListener('DOMContentLoaded', function() {
  // Check if we're on the grading view
  // The grading view is shown when user clicks "评分" in courses page
  // We hook into the existing showGrading function
  var _origShowGrading = window.showGrading;
  if (_origShowGrading) {
    window.showGrading = function() {
      showGradingEnhanced();
    };
  }
});

/**
 * Show enhanced grading view
 */
function showGradingEnhanced() {
  if (!GRADING_STATE.token) {
    alert('请先登录 / Please login first');
    window.location.href = '/login.html?redirect=/courses.html';
    return;
  }

  // Load user info
  loadUserInfo(function() {
    // Check if user is teacher/admin
    if (GRADING_STATE.user.role !== 'TEACHER' && GRADING_STATE.user.role !== 'ADMIN') {
      alert('无权限 / No permission (teacher only)');
      return;
    }
    renderGradingView();
  });
}

/**
 * Load user info
 */
function loadUserInfo(callback) {
  fetch(API + '/auth/me', { headers: { 'Authorization': 'Bearer ' + GRADING_STATE.token } })
    .then(function(r) { return r.json(); })
    .then(function(u) {
      GRADING_STATE.user = u;
      callback();
    })
    .catch(function() {
      alert('获取用户信息失败 / Failed to get user info');
    });
}

/**
 * Render grading view with tabs
 */
function renderGradingView() {
  var gradingList = document.getElementById('gradingList');
  if (!gradingList) {
    // Create grading container if not exists
    var view = document.getElementById('view-grading');
    if (!view) return;
    view.innerHTML = '<h2>教师阅卷 / Teacher Grading</h2>' +
      '<div class="grading-tabs">' +
        '<button class="grading-tab active" data-tab="pending" onclick="GradingModule.showTab(\'pending\')">待评分 / Pending</button>' +
        '<button class="grading-tab" data-tab="stats" onclick="GradingModule.showTab(\'stats\')">成绩统计 / Statistics</button>' +
      '</div>' +
      '<div id="gradingList"></div>';
    gradingList = document.getElementById('gradingList');
  }

  showView('view-grading');
  loadPendingGradings();
}

/**
 * Show specific tab
 */
function showTab(tab) {
  GRADING_STATE.currentGradingView = tab;
  document.querySelectorAll('.grading-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.tab === tab);
  });

  if (tab === 'pending') {
    loadPendingGradings();
  } else if (tab === 'stats') {
    loadStatsView();
  }
}

/**
 * Load pending gradings from API
 */
function loadPendingGradings() {
  var container = document.getElementById('gradingList');
  if (!container) return;

  container.innerHTML = '<div class="grading-loading">加载中... / Loading...</div>';

  fetch(API + '/courses/gradings/pending', {
    headers: { 'Authorization': 'Bearer ' + GRADING_STATE.token }
  })
    .then(function(r) { return r.json(); })
    .then(function(items) {
      GRADING_STATE.pendingGradings = items || [];
      renderPendingList(items || []);
    })
    .catch(function(err) {
      container.innerHTML = '<div class="grading-error">加载失败 / Failed to load: ' + err.message + '</div>';
    });
}

/**
 * Render pending grading list
 */
function renderPendingList(items) {
  var container = document.getElementById('gradingList');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML =
      '<div class="grading-empty">' +
        '<div class="grading-empty-icon">✅</div>' +
        '<p>暂无待评分题目 / No pending gradings</p>' +
      '</div>';
    return;
  }

  container.innerHTML = '<div class="grading-count">📋 待评分: ' + items.length + ' 题 / items</div>' +
    items.map(function(g) {
      var answerPreview = (g.studentAnswer || '(空 / empty)');
      if (answerPreview.length > 200) answerPreview = answerPreview.substring(0, 200) + '...';
      return '<div class="grading-card" id="grading-' + g.id + '">' +
        '<div class="grading-card-header">' +
          '<span class="grading-q-num">题目 #' + (g.questionIndex + 1) + '</span>' +
          '<span class="grading-status grading-status-pending">⏳ 待评分</span>' +
        '</div>' +
        '<div class="grading-student-answer">' +
          '<label>📝 学生答案 / Student Answer:</label>' +
          '<div class="grading-answer-text">' + escapeHtml(answerPreview) + '</div>' +
        '</div>' +
        '<div class="grading-score-row">' +
          '<div class="grading-score-input">' +
            '<label>分数 / Score:</label>' +
            '<input type="number" min="0" max="100" id="score-' + g.id + '" placeholder="0-100" class="grading-score-field">' +
          '</div>' +
          '<div class="grading-comment-input">' +
            '<label>批注 / Comment:</label>' +
            '<input type="text" id="comment-' + g.id + '" placeholder="批注（可选）" class="grading-comment-field">' +
          '</div>' +
          '<button class="grading-grade-btn" onclick="GradingModule.submitGrade(' + g.id + ')">' +
            '提交评分 / Submit Grade' +
          '</button>' +
        '</div>' +
      '</div>';
    }).join('');
}

/**
 * Submit a grade
 */
function submitGrade(gradingId) {
  var scoreInput = document.getElementById('score-' + gradingId);
  var commentInput = document.getElementById('comment-' + gradingId);
  if (!scoreInput || !commentInput) return;

  var score = parseInt(scoreInput.value, 10);
  if (isNaN(score) || score < 0 || score > 100) {
    alert('请输入有效分数 (0-100) / Please enter valid score (0-100)');
    return;
  }

  var comment = commentInput.value || '';

  fetch(API + '/courses/gradings/' + gradingId + '/grade', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + GRADING_STATE.token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ score: score, comment: comment })
  })
    .then(function(r) {
      if (!r.ok) throw new Error('Submit failed');
      return r.json();
    })
    .then(function(result) {
      // Animate card removal
      var card = document.getElementById('grading-' + gradingId);
      if (card) {
        card.classList.add('grading-card-graded');
        card.innerHTML = '<div class="grading-graded-msg">✅ 已评分 / Graded — Score: ' + score + '</div>';
        setTimeout(function() {
          card.style.opacity = '0';
          card.style.transform = 'translateX(20px)';
          setTimeout(function() { card.remove(); }, 300);
        }, 1500);
      }

      // Update count
      var countEl = document.querySelector('.grading-count');
      if (countEl) {
        GRADING_STATE.pendingGradings = GRADING_STATE.pendingGradings.filter(function(g) {
          return g.id !== gradingId;
        });
        if (GRADING_STATE.pendingGradings.length === 0) {
          setTimeout(function() { loadPendingGradings(); }, 2000);
        } else {
          countEl.textContent = '📋 待评分: ' + GRADING_STATE.pendingGradings.length + ' 题 / items';
        }
      }
    })
    .catch(function(err) {
      alert('提交失败 / Submit failed: ' + err.message);
    });
}

/**
 * Load statistics view — class-wide score distribution
 */
function loadStatsView() {
  var container = document.getElementById('gradingList');
  if (!container) return;

  container.innerHTML =
    '<div class="grading-stats-input">' +
      '<label>考试 ID / Exam ID:</label>' +
      '<input type="number" id="statsExamId" placeholder="输入考试ID" class="grading-stats-input-field">' +
      '<button onclick="GradingModule.loadExamStats()" class="grading-stats-load-btn">查询 / Load</button>' +
    '</div>' +
    '<div id="gradingStatsPanel"></div>';
}

/**
 * Load exam statistics
 */
function loadExamStats() {
  var examIdInput = document.getElementById('statsExamId');
  if (!examIdInput || !examIdInput.value) {
    alert('请输入考试 ID / Please enter exam ID');
    return;
  }

  var examId = parseInt(examIdInput.value, 10);
  GRADING_STATE.currentExamId = examId;
  var panel = document.getElementById('gradingStatsPanel');
  if (!panel) return;

  panel.innerHTML = '<div class="grading-loading">加载中... / Loading...</div>';

  fetch(API + '/courses/exams/' + examId + '/results/all', {
    headers: { 'Authorization': 'Bearer ' + GRADING_STATE.token }
  })
    .then(function(r) { return r.json(); })
    .then(function(results) {
      GRADING_STATE.allResults = results || [];
      renderStats(results || []);
    })
    .catch(function(err) {
      panel.innerHTML = '<div class="grading-error">加载失败 / Failed: ' + err.message + '</div>';
    });
}

/**
 * Render statistics
 */
function renderStats(results) {
  var panel = document.getElementById('gradingStatsPanel');
  if (!panel) return;

  if (results.length === 0) {
    panel.innerHTML = '<div class="grading-empty"><p>暂无成绩数据 / No results</p></div>';
    return;
  }

  // Calculate statistics
  var scores = results.map(function(r) { return r.score; });
  var max = Math.max.apply(null, scores);
  var min = Math.min.apply(null, scores);
  var avg = scores.reduce(function(a, b) { return a + b; }, 0) / scores.length;
  var passCount = results.filter(function(r) { return r.passed; }).length;
  var passRate = Math.round((passCount / results.length) * 100);

  // Score distribution buckets
  var buckets = [
    { range: '0-59', count: 0, color: '#f44336' },
    { range: '60-69', count: 0, color: '#ff9800' },
    { range: '70-79', count: 0, color: '#ffd700' },
    { range: '80-89', count: 0, color: '#4caf50' },
    { range: '90-100', count: 0, color: '#4a9eff' }
  ];
  scores.forEach(function(s) {
    if (s < 60) buckets[0].count++;
    else if (s < 70) buckets[1].count++;
    else if (s < 80) buckets[2].count++;
    else if (s < 90) buckets[3].count++;
    else buckets[4].count++;
  });

  var maxBucket = Math.max.apply(null, buckets.map(function(b) { return b.count; }));

  panel.innerHTML =
    '<div class="grading-stats-summary">' +
      '<div class="stat-card"><div class="stat-value">' + results.length + '</div><div class="stat-label">参加人数 / Students</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + avg.toFixed(1) + '</div><div class="stat-label">平均分 / Average</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + max + '</div><div class="stat-label">最高分 / Max</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + min + '</div><div class="stat-label">最低分 / Min</div></div>' +
      '<div class="stat-card"><div class="stat-value">' + passRate + '%</div><div class="stat-label">及格率 / Pass Rate</div></div>' +
    '</div>' +
    '<div class="grading-distribution">' +
      '<h4>📊 成绩分布 / Score Distribution</h4>' +
      buckets.map(function(b) {
        var pct = maxBucket > 0 ? (b.count / maxBucket) * 100 : 0;
        return '<div class="dist-bar">' +
          '<span class="dist-label">' + b.range + '</span>' +
          '<div class="dist-bar-track">' +
            '<div class="dist-bar-fill" style="width:' + pct + '%;background:' + b.color + '">' + b.count + '</div>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>' +
    '<div class="grading-student-list">' +
      '<h4>👥 学生成绩 / Student Results</h4>' +
      '<table class="grading-table">' +
        '<thead><tr><th>用户ID</th><th>尝试次数</th><th>分数</th><th>状态</th><th>提交时间</th></tr></thead>' +
        '<tbody>' +
          results.map(function(r) {
            var date = new Date(r.submittedAt).toLocaleString();
            var status = r.passed ? '<span class="grading-status-passed">✅ 通过</span>' : '<span class="grading-status-failed">❌ 未通过</span>';
            return '<tr>' +
              '<td>' + r.userId + '</td>' +
              '<td>' + r.attemptNumber + '</td>' +
              '<td class="score-cell">' + r.score + '</td>' +
              '<td>' + status + '</td>' +
              '<td class="date-cell">' + date + '</td>' +
            '</tr>';
          }).join('') +
        '</tbody>' +
      '</table>' +
    '</div>';
}

/**
 * Show a view by ID (reuses courses.js showView)
 */
function showView(viewId) {
  if (typeof window.showView === 'function') {
    window.showView(viewId);
  } else {
    document.querySelectorAll('.course-view').forEach(function(v) { v.style.display = 'none'; });
    var el = document.getElementById(viewId);
    if (el) el.style.display = 'block';
  }
}

/**
 * Escape HTML
 */
function escapeHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Export ───
window.GradingModule = {
  showTab: showTab,
  submitGrade: submitGrade,
  loadExamStats: loadExamStats,
  showGradingEnhanced: showGradingEnhanced,
  reset: function() {
    GRADING_STATE.pendingGradings = [];
    GRADING_STATE.allResults = [];
    GRADING_STATE.currentExamId = null;
  }
};

// Override showGrading when courses.js is loaded
var checkInterval = setInterval(function() {
  if (window.showGrading) {
    clearInterval(checkInterval);
    var _orig = window.showGrading;
    window.showGrading = function() {
      if (GRADING_STATE.token) {
        showGradingEnhanced();
      } else {
        _orig.call(this);
      }
    };
  }
}, 100);

})();
