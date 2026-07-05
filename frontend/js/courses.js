/**
 * Courses — independent course system
 * State management + API calls + rendering
 */
(function() {
'use strict';

var API = '/api/v1';
var state = {
  token: localStorage.getItem('jwt_token') || '',
  user: null,
  courses: [],
  currentCourse: null,
  currentLesson: null,
  currentExam: null,
  filter: '',
  domain: ''
};

// ─── Init ───
document.addEventListener('DOMContentLoaded', function() {
  // Parse token from URL or localStorage
  var m = window.location.hash.match(/token=(.+)/);
  if (m) { state.token = m[1]; localStorage.setItem('jwt_token', state.token); }
  if (state.token) { loadUserInfo(); }
  loadCourses();
});

function loadUserInfo() {
  fetch(API + '/auth/me', { headers: { 'Authorization': 'Bearer ' + state.token } })
    .then(function(r) { return r.json(); })
    .then(function(u) { state.user = u; renderUserArea(); })
    .catch(function() { state.token = ''; });
}

function renderUserArea() {
  var el = document.getElementById('courseUserArea');
  if (!state.user) { el.innerHTML = '<a href="/">登录</a>'; return; }
  el.innerHTML = '👤 ' + (state.user.displayName || state.user.username) +
    ' <a href="#certs" onclick="showCertificates()" style="margin-left:12px">证书</a>';
  if (state.user.role === 'TEACHER' || state.user.role === 'ADMIN') {
    el.innerHTML += ' <a href="#grading" onclick="showGrading()" style="margin-left:8px">评分</a>';
    var al = document.getElementById('adminLink');
    if (al) al.style.display = 'inline';
  }
}

// ─── Course List ───
function loadCourses() {
  var url = API + '/courses';
  if (state.domain) url += '?domain=' + encodeURIComponent(state.domain);
  fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      state.courses = data;
      renderCourseGrid();
    })
    .catch(function(err) {
      document.getElementById('courseGrid').innerHTML = '<div class="course-loading">加载失败</div>';
    });
}

function renderCourseGrid() {
  var grid = document.getElementById('courseGrid');
  var filtered = state.courses;
  if (state.filter) filtered = filtered.filter(function(c) { return c.category === state.filter; });
  if (state.domain) filtered = filtered.filter(function(c) { return c.domain === state.domain; });

  if (!filtered.length) {
    grid.innerHTML = '<div class="course-loading">暂无课程</div>';
    return;
  }

  grid.innerHTML = filtered.map(function(c) {
    var icon = c.icon || '📖';
    var priceText = c.price > 0 ? '¥' + c.price : '免费';
    return '<div class="course-card" onclick="openCourse(' + c.id + ')">' +
      '<div class="card-icon">' + icon + '</div>' +
      '<div class="card-title">' + escHtml(c.title) + (c.titleEn ? ' / ' + escHtml(c.titleEn) : '') + '</div>' +
      '<div class="card-desc">' + escHtml((c.description || '').substring(0, 100)) + '</div>' +
      '<div class="card-meta">' +
        '<span>👥 ' + (c.enrollmentCount || 0) + '</span>' +
        '<span>⏱ ' + (c.estimatedHours || '?') + 'h</span>' +
        '<span class="card-price">' + priceText + '</span>' +
      '</div></div>';
  }).join('');
}

// Filter buttons
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('filter-btn')) {
    document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
    e.target.classList.add('active');
    state.filter = e.target.dataset.cat;
    renderCourseGrid();
  }
});

// Domain tabs
if (document.querySelector('.domain-tab')) {
  document.querySelectorAll('.domain-tab').forEach(function(t) {
    t.addEventListener('click', function() {
      document.querySelectorAll('.domain-tab').forEach(function(b) { b.classList.remove('active'); });
      t.classList.add('active');
      state.domain = t.dataset.domain;
      loadCourses();
    });
  });
}

// ─── Course Detail ───
function openCourse(courseId) {
  fetch(API + '/courses/' + courseId)
    .then(function(r) { return r.json(); })
    .then(function(detail) {
      state.currentCourse = detail;
      renderCourseDetail();
      showView('view-course-detail');
      // Check enrollment
      if (state.token) {
        fetch(API + '/courses/' + courseId + '/progress', { headers: authHeaders() })
          .then(function(r) { return r.json(); })
          .then(function(progress) {
            state.currentCourse.progress = progress;
            updateProgressDisplay();
          })
          .catch(function() {});
      }
    });
}

function renderCourseDetail() {
  var c = state.currentCourse.course;
  document.getElementById('detailTitle').textContent = c.title + (c.titleEn ? ' / ' + c.titleEn : '');
  document.getElementById('detailDesc').textContent = c.description || '';
  document.getElementById('detailDifficulty').textContent = '难度: ' + (c.difficulty || 'beginner');
  document.getElementById('detailHours').textContent = '时长: ' + (c.estimatedHours || '?') + '小时';
  document.getElementById('detailEnrollment').textContent = '学员: ' + (c.enrollmentCount || 0);

  var content = '';
  // Sections & Lessons
  (state.currentCourse.sections || []).forEach(function(sec) {
    content += '<div class="section-block">';
    content += '<h3 class="section-title">' + escHtml(sec.title) + (sec.titleEn ? ' / ' + escHtml(sec.titleEn) : '') + '</h3>';
    (sec.lessons || []).forEach(function(les) {
      var icon = les.lessonType === 'video' ? '🎥' : les.lessonType === 'quiz' ? '📝' : '📄';
      var done = isLessonDone(les.id);
      content += '<div class="lesson-item' + (done ? ' completed' : '') + '" onclick="openLesson(' + les.id + ')">' +
        '<span class="lesson-icon">' + icon + '</span>' +
        '<span class="lesson-title">' + escHtml(les.title) + '</span>' +
        '<span class="lesson-duration">' + (les.durationMinutes || '?') + 'min</span>' +
        (done ? '<span class="check-mark">✓</span>' : '') +
        '</div>';
    });
    content += '</div>';
  });

  // Exams
  (state.currentCourse.exams || []).forEach(function(exam) {
    content += '<div class="exam-item" onclick="openExam(' + exam.id + ')">' +
      '<span>📝</span>' +
      '<span style="flex:1">' + escHtml(exam.title) + '</span>' +
      '<span style="font-size:12px;color:var(--course-muted)">及格:' + (exam.passingScore || 60) + '%</span>' +
      '</div>';
  });

  document.getElementById('courseContent').innerHTML = content;
}

function updateProgressDisplay() {
  var progress = state.currentCourse.progress || [];
  var total = 0, done = 0;
  (state.currentCourse.sections || []).forEach(function(sec) {
    (sec.lessons || []).forEach(function(les) {
      total++;
      if (progress.find(function(p) { return p.lessonId === les.id && p.completed; })) done++;
    });
  });
  if (total > 0) {
    var pct = Math.round((done / total) * 100);
    document.getElementById('progressBar').style.display = 'block';
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressText').textContent = pct + '%';
    if (pct >= 100) {
      var btn = document.getElementById('enrollBtn');
      btn.textContent = '✅ 已完成';
      btn.classList.add('enrolled');
      btn.disabled = true;
    }
  }
}

function isLessonDone(lessonId) {
  if (!state.currentCourse || !state.currentCourse.progress) return false;
  return state.currentCourse.progress.some(function(p) { return p.lessonId === lessonId && p.completed; });
}

function enrollCourse() {
  if (!state.token) { alert('请先登录'); window.location.href = '/'; return; }
  var courseId = state.currentCourse.course.id;
  fetch(API + '/courses/' + courseId + '/enroll', { method: 'POST', headers: authHeaders() })
    .then(function(r) { return r.json(); })
    .then(function(e) {
      var btn = document.getElementById('enrollBtn');
      btn.textContent = '✅ 已报名';
      btn.classList.add('enrolled');
    })
    .catch(function() { alert('报名失败'); });
}

// ─── Lesson Reader ───
function openLesson(lessonId) {
  fetch(API + '/courses/' + state.currentCourse.course.id + '/lessons/' + lessonId)
    .then(function(r) { return r.json(); })
    .then(function(lesson) {
      state.currentLesson = lesson;
      document.getElementById('lessonTitle').textContent = lesson.title;
      var body = document.getElementById('lessonBody');
      if (lesson.lessonType === 'video' && lesson.videoUrl) {
        body.innerHTML = '<iframe src="' + escAttr(lesson.videoUrl) + '" width="100%" height="450" frameborder="0" allowfullscreen></iframe>' +
          '<div style="margin-top:16px">' + (lesson.content || '') + '</div>';
      } else {
        body.innerHTML = lesson.content || '';
      }
      showView('view-lesson');
    });
}

function completeLesson() {
  if (!state.token) { alert('请先登录'); return; }
  var lesson = state.currentLesson;
  var courseId = state.currentCourse.course.id;
  fetch(API + '/courses/' + courseId + '/lessons/' + lesson.id + '/complete', { method: 'POST', headers: authHeaders() })
    .then(function(r) { return r.json(); })
    .then(function() {
      var btn = document.getElementById('completeBtn');
      btn.textContent = '✅ 已完成';
      btn.disabled = true;
    });
}

function prevLesson() { navLesson(-1); }
function nextLesson() { navLesson(1); }
function navLesson(dir) {
  var allLessons = [];
  (state.currentCourse.sections || []).forEach(function(s) {
    (s.lessons || []).forEach(function(l) { allLessons.push(l); });
  });
  var idx = allLessons.findIndex(function(l) { return l.id === state.currentLesson.id; });
  var next = idx + dir;
  if (next >= 0 && next < allLessons.length) openLesson(allLessons[next].id);
}

// ─── Exam ───
var examAnswers = {};

function openExam(examId) {
  fetch(API + '/courses/' + state.currentCourse.course.id + '/exams/' + examId)
    .then(function(r) { return r.json(); })
    .then(function(exam) {
      state.currentExam = exam;
      examAnswers = {};
      document.getElementById('examTitle').textContent = exam.title;
      document.getElementById('examMeta').innerHTML =
        '<span>总分: ' + (exam.totalScore || 100) + '</span>' +
        '<span>及格: ' + (exam.passingScore || 60) + '%</span>' +
        '<span>时限: ' + (exam.timeLimitMinutes || 0) + 'min</span>' +
        '<span>可重考: ' + (exam.maxAttempts || 0) + '次</span>';

      var questions = [];
      try { questions = JSON.parse(exam.questions); } catch(e) {}

      var body = document.getElementById('examBody');
      body.innerHTML = questions.map(function(q, idx) {
        var html = '<div class="exam-question" data-idx="' + idx + '">';
        html += '<div class="q-title">' + (idx+1) + '. ' + escHtml(q.question || '') + ' (' + (q.score || 0) + '分)</div>';

        if (q.type === 'single_choice' || q.type === 'true_false') {
          var opts = q.options || (q.type === 'true_false' ? ['正确','错误'] : []);
          html += opts.map(function(opt, oi) {
            return '<label class="q-option" data-val="' + oi + '" onclick="selectAnswer(' + idx + ',' + oi + ')">' + escHtml(opt) + '</label>';
          }).join('');
        } else if (q.type === 'multiple_choice') {
          var mopts = q.options || [];
          html += mopts.map(function(opt, oi) {
            return '<label class="q-option" data-val="' + oi + '" onclick="toggleAnswer(' + idx + ',' + oi + ')"><input type="checkbox"> ' + escHtml(opt) + '</label>';
          }).join('');
        } else if (q.type === 'fill_blank') {
          html += '<input type="text" class="q-input" data-idx="' + idx + '" placeholder="填写答案" oninput="setTextAnswer(' + idx + ', this.value)" style="width:100%;padding:10px;background:var(--course-surface2);border:1px solid var(--course-border);border-radius:8px;color:var(--course-text)">';
        } else { // short_answer, essay
          html += '<textarea data-idx="' + idx + '" placeholder="请输入你的答案..." oninput="setTextAnswer(' + idx + ', this.value)"></textarea>';
        }
        html += '</div>';
        return html;
      }).join('');

      showView('view-exam');
    });
}

function selectAnswer(qIdx, val) {
  examAnswers[qIdx] = String(val);
  var q = document.querySelector('.exam-question[data-idx="' + qIdx + '"]');
  q.querySelectorAll('.q-option').forEach(function(el) { el.classList.remove('selected'); });
  q.querySelector('.q-option[data-val="' + val + '"]').classList.add('selected');
}

function toggleAnswer(qIdx, val) {
  if (!examAnswers[qIdx]) examAnswers[qIdx] = [];
  var arr = examAnswers[qIdx].split(',');
  var i = arr.indexOf(String(val));
  if (i >= 0) arr.splice(i, 1); else arr.push(String(val));
  examAnswers[qIdx] = arr.sort().join(',');
}

function setTextAnswer(qIdx, val) {
  examAnswers[qIdx] = val;
}

function submitExam() {
  if (!state.token) { alert('请先登录'); return; }
  if (!confirm('确定提交考试？')) return;

  var answers = [];
  for (var i = 0; i < Object.keys(examAnswers).length; i++) {
    answers.push(examAnswers[i] || '');
  }

  fetch(API + '/courses/' + state.currentCourse.course.id + '/exams/' + state.currentExam.id + '/submit', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ answers: JSON.stringify(answers) })
  })
    .then(function(r) { return r.json(); })
    .then(function(result) {
      alert('考试结果: 得分=' + result.score + (result.passed ? ' ✅ 通过' : ' ❌ 未通过'));
      backToCourse();
    })
    .catch(function() { alert('提交失败'); });
}

// ─── Certificates ───
function showCertificates() {
  if (!state.token) return;
  fetch(API + '/courses/my/certificates', { headers: authHeaders() })
    .then(function(r) { return r.json(); })
    .then(function(certs) {
      var html = certs.length ? certs.map(function(c) {
        return '<div class="cert-card">' +
          '<div style="font-size:18px;font-weight:600">🎓 证书</div>' +
          '<div>课程ID: ' + c.courseId + '</div>' +
          '<div>成绩: ' + (c.finalScore || 'N/A') + '%</div>' +
          '<div class="cert-code">' + c.certificateCode + '</div>' +
          '<div>签发: ' + new Date(c.issuedAt).toLocaleDateString() + '</div>' +
          '</div>';
      }).join('') : '<p>暂无证书</p>';
      document.getElementById('certList').innerHTML = html;
      showView('view-certificates');
    });
}

// ─── Teacher: Grading ───
function showGrading() {
  if (!state.token) return;
  fetch(API + '/courses/gradings/pending', { headers: authHeaders() })
    .then(function(r) { return r.json(); })
    .then(function(items) {
      var html = items.length ? items.map(function(g) {
        return '<div class="grading-item">' +
          '<div>题目 #' + (g.questionIndex + 1) + '</div>' +
          '<div class="grading-answer">' + escHtml(g.studentAnswer || '(空)') + '</div>' +
          '<div class="grading-input">' +
            '<input type="number" min="0" max="100" placeholder="评分" id="grade-' + g.id + '">' +
            '<input type="text" placeholder="批注" id="comment-' + g.id + '" style="flex:1">' +
            '<button onclick="submitGrade(' + g.id + ')">提交评分</button>' +
          '</div></div>';
      }).join('') : '<p>暂无待评分题目</p>';
      document.getElementById('gradingList').innerHTML = html;
      showView('view-grading');
    });
}

function submitGrade(gradingId) {
  var score = parseInt(document.getElementById('grade-' + gradingId).value);
  var comment = document.getElementById('comment-' + gradingId).value;
  if (isNaN(score)) { alert('请输入分数'); return; }
  fetch(API + '/courses/gradings/' + gradingId + '/grade', {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ score: score, comment: comment })
  })
    .then(function(r) { return r.json(); })
    .then(function() { showGrading(); })
    .catch(function() { alert('提交失败'); });
}

// ─── Helpers ───
function showView(id) {
  document.querySelectorAll('.course-view').forEach(function(v) { v.style.display = 'none'; });
  document.getElementById(id).style.display = 'block';
}
function showCourseList() { showView('view-course-list'); }
function backToCourse() { renderCourseDetail(); showView('view-course-detail'); }
function authHeaders() {
  return { 'Authorization': 'Bearer ' + state.token, 'Content-Type': 'application/json' };
}
function escHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s) { return (s||'').replace(/"/g,'&quot;'); }

// Expose for inline onclick handlers
window.openCourse = openCourse;
window.openLesson = openLesson;
window.openExam = openExam;
window.enrollCourse = enrollCourse;
window.completeLesson = completeLesson;
window.prevLesson = prevLesson;
window.nextLesson = nextLesson;
window.submitExam = submitExam;
window.selectAnswer = selectAnswer;
window.toggleAnswer = toggleAnswer;
window.setTextAnswer = setTextAnswer;
window.showCertificates = showCertificates;
window.showGrading = showGrading;
window.submitGrade = submitGrade;
window.showCourseList = showCourseList;
window.backToCourse = backToCourse;

})();
