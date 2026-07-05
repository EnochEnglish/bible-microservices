/**
 * Course Admin — full CRUD management for courses, sections, lessons, exams
 */
(function() {
'use strict';

var API = '/api/v1';
var token = localStorage.getItem('jwt_token') || '';
var state = {
  courses: [],
  editingCourse: null,
  currentTab: 'courses'
};

// ─── Init ───
document.addEventListener('DOMContentLoaded', function() {
  if (!token) { window.location.href = '/login.html?redirect=/course-admin.html'; return; }
  loadUser();
  loadMyCourses();
  setupTabs();
  loadGrading();
});

function loadUser() {
  fetch(API + '/auth/me', { headers: auth() })
    .then(function(r) { return r.json(); })
    .then(function(u) {
      document.getElementById('adminUser').textContent = '👤 ' + (u.displayName || u.username) + ' (' + u.role + ')';
      if (u.role !== 'ADMIN' && u.role !== 'TEACHER') {
        alert('仅管理员和教师可访问');
        window.location.href = '/courses.html';
      }
    })
    .catch(function() { window.location.href = '/'; });
}

function auth() { return { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }; }
function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ─── Tabs ───
function setupTabs() {
  document.querySelectorAll('.atab').forEach(function(t) {
    t.addEventListener('click', function() {
      document.querySelectorAll('.atab').forEach(function(b) { b.classList.remove('active'); });
      t.classList.add('active');
      state.currentTab = t.dataset.tab;
      document.querySelectorAll('.atab-content').forEach(function(c) { c.style.display = 'none'; });
      document.getElementById('tab-' + state.currentTab).style.display = 'block';
    });
  });
}

// ─── Course List (My Teaching) ───
function loadMyCourses() {
  fetch(API + '/courses/my/teaching', { headers: auth() })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      state.courses = data;
      renderCourseTable();
      populateStudentSelect();
    })
    .catch(function() {
      // Fallback: load all courses
      fetch(API + '/courses')
        .then(function(r) { return r.json(); })
        .then(function(data) { state.courses = data; renderCourseTable(); populateStudentSelect(); });
    });
}

function renderCourseTable() {
  var tbody = document.getElementById('courseTableBody');
  if (!state.courses.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;opacity:0.5;padding:20px">暂无课程</td></tr>';
    return;
  }
  tbody.innerHTML = state.courses.map(function(c) {
    return '<tr>' +
      '<td>' + c.id + '</td>' +
      '<td>' + esc(c.title) + (c.titleEn ? ' / ' + esc(c.titleEn) : '') + '</td>' +
      '<td>' + esc(c.domain || 'theology') + '</td>' +
      '<td>' + esc(c.category || '-') + '</td>' +
      '<td>' + (c.status === 'published' ? '✅ 已发布' : '📝 草稿') + '</td>' +
      '<td>' + (c.enrollmentCount || 0) + '</td>' +
      '<td>' +
        '<button class="btn-edit" onclick="editCourse(' + c.id + ')">编辑</button>' +
        '<button class="btn-lessons" onclick="manageStructure(' + c.id + ')">章节</button>' +
        '<button class="btn-delete" onclick="deleteCourse(' + c.id + ')">删除</button>' +
      '</td></tr>';
  }).join('');
}

// ─── Create/Edit Course ───
function editCourse(id) {
  var c = state.courses.find(function(x) { return x.id === id; });
  if (!c) return;
  document.getElementById('formTitle').textContent = '编辑课程 #' + id;
  document.getElementById('editCourseId').value = id;
  document.getElementById('f_title').value = c.title || '';
  document.getElementById('f_titleEn').value = c.titleEn || '';
  document.getElementById('f_desc').value = c.description || '';
  document.getElementById('f_descEn').value = c.descriptionEn || '';
  document.getElementById('f_domain').value = c.domain || 'theology';
  document.getElementById('f_category').value = c.category || '';
  document.getElementById('f_difficulty').value = c.difficulty || 'beginner';
  document.getElementById('f_hours').value = c.estimatedHours || 10;
  document.getElementById('f_price').value = c.price || 0;
  document.getElementById('f_icon').value = c.icon || '📖';
  document.getElementById('f_tags').value = c.tags || '';
  document.getElementById('f_published').checked = (c.status === 'published');

  // Show structure editor
  document.getElementById('structureEditor').style.display = 'block';
  document.getElementById('examEditor').style.display = 'block';
  loadStructure(id);

  // Switch to create tab
  document.querySelector('.atab[data-tab="create"]').click();
}

function manageStructure(id) {
  editCourse(id);
}

function saveCourse() {
  var id = document.getElementById('editCourseId').value;
  var body = {
    title: document.getElementById('f_title').value,
    titleEn: document.getElementById('f_titleEn').value || null,
    description: document.getElementById('f_desc').value || null,
    descriptionEn: document.getElementById('f_descEn').value || null,
    domain: document.getElementById('f_domain').value,
    category: document.getElementById('f_category').value || null,
    difficulty: document.getElementById('f_difficulty').value,
    estimatedHours: parseInt(document.getElementById('f_hours').value) || null,
    price: parseInt(document.getElementById('f_price').value) || 0,
    icon: document.getElementById('f_icon').value || null,
    tags: document.getElementById('f_tags').value || null,
    isPublished: document.getElementById('f_published').checked
  };

  if (!body.title) { alert('请输入标题'); return; }

  var method = id ? 'PUT' : 'POST';
  var url = API + '/courses' + (id ? '/' + id : '');

  fetch(url, { method: method, headers: auth(), body: JSON.stringify(body) })
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(c) {
      alert(id ? '课程已更新' : '课程已创建');
      resetForm();
      loadMyCourses();
    })
    .catch(function(e) { alert('保存失败: ' + e.message); });
}

function resetForm() {
  document.getElementById('formTitle').textContent = '创建新课程';
  document.getElementById('editCourseId').value = '';
  ['f_title','f_titleEn','f_desc','f_descEn','f_category','f_tags'].forEach(function(id) {
    document.getElementById(id).value = '';
  });
  document.getElementById('f_domain').value = 'theology';
  document.getElementById('f_difficulty').value = 'beginner';
  document.getElementById('f_hours').value = '10';
  document.getElementById('f_price').value = '0';
  document.getElementById('f_icon').value = '📖';
  document.getElementById('f_published').checked = true;
  document.getElementById('structureEditor').style.display = 'none';
  document.getElementById('examEditor').style.display = 'none';
}

function deleteCourse(id) {
  if (!confirm('确定删除课程 #' + id + '？所有章节、课时、考试数据将被删除。')) return;
  fetch(API + '/courses/' + id, { method: 'DELETE', headers: auth() })
    .then(function() { loadMyCourses(); })
    .catch(function(e) { alert('删除失败: ' + e.message); });
}

// ─── Structure (Sections & Lessons) ───
function loadStructure(courseId) {
  fetch(API + '/courses/' + courseId)
    .then(function(r) { return r.json(); })
    .then(function(detail) {
      state.editingCourse = detail;
      renderSections();
      renderExams();
    });
}

function renderSections() {
  var d = state.editingCourse;
  if (!d) return;
  var html = (d.sections || []).map(function(sec) {
    var lessons = (sec.lessons || []).map(function(l) {
      return '<div class="lesson-edit-item">' +
        '<select onchange="updateLessonType(' + l.id + ',this.value)">' +
        '<option value="article"' + (l.lessonType==='article'?' selected':'') + '>📄</option>' +
        '<option value="video"' + (l.lessonType==='video'?' selected':'') + '>🎥</option>' +
        '</select>' +
        '<input value="' + esc(l.title) + '" onchange="updateLessonTitle(' + l.id + ',this.value)">' +
        '<input value="' + (l.durationMinutes||'') + '" style="width:60px" placeholder="min" onchange="updateLessonDuration(' + l.id + ',this.value)">' +
        '<button class="btn-delete" onclick="deleteLesson(' + l.id + ')">✕</button>' +
        '</div>';
    }).join('');
    return '<div class="section-block">' +
      '<div class="section-header">' +
      '<span>📂</span>' +
      '<input value="' + esc(sec.title) + '" onchange="updateSectionTitle(' + sec.id + ',this.value)">' +
      '<button class="btn-delete" onclick="deleteSection(' + sec.id + ')">✕</button>' +
      '</div>' + lessons +
      '<div style="margin-top:6px"><input id="newLesson_' + sec.id + '" placeholder="新课时标题" style="padding:4px 8px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;color:var(--text);width:60%">' +
      '<button class="btn-secondary" style="padding:4px 8px" onclick="addLesson(' + sec.id + ')">➕ 课时</button></div>' +
      '</div>';
  }).join('');
  document.getElementById('sectionsList').innerHTML = html || '<p style="opacity:0.5">暂无章节</p>';
}

function addSection() {
  var title = document.getElementById('newSectionTitle').value;
  if (!title) return;
  var cid = document.getElementById('editCourseId').value;
  fetch(API + '/courses/' + cid + '/sections', {
    method: 'POST', headers: auth(),
    body: JSON.stringify({ title: title, orderIndex: (state.editingCourse.sections||[]).length })
  })
    .then(function(r) { return r.json(); })
    .then(function() { document.getElementById('newSectionTitle').value = ''; loadStructure(cid); });
}

function deleteSection(sid) {
  if (!confirm('删除此章节及所有课时？')) return;
  var cid = document.getElementById('editCourseId').value;
  fetch(API + '/courses/' + cid + '/sections/' + sid, { method: 'DELETE', headers: auth() })
    .then(function() { loadStructure(cid); });
}

function updateSectionTitle(sid, title) {
  var cid = document.getElementById('editCourseId').value;
  var sec = state.editingCourse.sections.find(function(s){return s.id===sid;});
  fetch(API + '/courses/' + cid + '/sections/' + sid, {
    method: 'PUT', headers: auth(),
    body: JSON.stringify({ title: title, titleEn: sec.titleEn, orderIndex: sec.orderIndex })
  });
}

function addLesson(secId) {
  var title = document.getElementById('newLesson_' + secId).value;
  if (!title) return;
  var cid = document.getElementById('editCourseId').value;
  fetch(API + '/courses/' + cid + '/sections/' + secId + '/lessons', {
    method: 'POST', headers: auth(),
    body: JSON.stringify({ title: title, lessonType: 'article', content: '', orderIndex: 0 })
  })
    .then(function(r) { return r.json(); })
    .then(function() { document.getElementById('newLesson_' + secId).value = ''; loadStructure(cid); });
}

function deleteLesson(lid) {
  if (!confirm('删除此课时？')) return;
  var cid = document.getElementById('editCourseId').value;
  fetch(API + '/courses/' + cid + '/lessons/' + lid, { method: 'DELETE', headers: auth() })
    .then(function() { loadStructure(cid); });
}

function updateLessonTitle(lid, title) {
  var cid = document.getElementById('editCourseId').value;
  var lesson = findLesson(lid);
  if (!lesson) return;
  fetch(API + '/courses/' + cid + '/lessons/' + lid, {
    method: 'PUT', headers: auth(),
    body: JSON.stringify({ title: title, titleEn: lesson.titleEn, lessonType: lesson.lessonType, content: lesson.content||'', orderIndex: lesson.orderIndex, durationMinutes: lesson.durationMinutes })
  });
}

function updateLessonDuration(lid, min) {
  var cid = document.getElementById('editCourseId').value;
  var lesson = findLesson(lid);
  if (!lesson) return;
  fetch(API + '/courses/' + cid + '/lessons/' + lid, {
    method: 'PUT', headers: auth(),
    body: JSON.stringify({ title: lesson.title, titleEn: lesson.titleEn, lessonType: lesson.lessonType, content: lesson.content||'', orderIndex: lesson.orderIndex, durationMinutes: parseInt(min)||0 })
  });
}

function updateLessonType(lid, type) {
  var cid = document.getElementById('editCourseId').value;
  var lesson = findLesson(lid);
  if (!lesson) return;
  fetch(API + '/courses/' + cid + '/lessons/' + lid, {
    method: 'PUT', headers: auth(),
    body: JSON.stringify({ title: lesson.title, titleEn: lesson.titleEn, lessonType: type, content: lesson.content||'', orderIndex: lesson.orderIndex, durationMinutes: lesson.durationMinutes })
  });
}

function findLesson(lid) {
  if (!state.editingCourse) return null;
  for (var s of state.editingCourse.sections) {
    for (var l of (s.lessons||[])) { if (l.id === lid) return l; }
  }
  return null;
}

// ─── Exams ───
function renderExams() {
  var d = state.editingCourse;
  if (!d) return;
  var html = (d.exams || []).map(function(e) {
    return '<div class="section-block">' +
      '<div class="section-header"><span>📝</span>' +
      '<input value="' + esc(e.title) + '" readonly>' +
      '<button class="btn-delete" onclick="deleteExam(' + e.id + ')">✕</button></div>' +
      '<div style="font-size:12px;opacity:0.6;margin-top:4px">类型:' + esc(e.examType) + ' 及格:' + (e.passingScore||60) + '% 总分:' + (e.totalScore||100) + '</div>' +
      '</div>';
  }).join('');
  document.getElementById('examsList').innerHTML = html || '<p style="opacity:0.5">暂无考试</p>';
}

function addExam() {
  var title = document.getElementById('newExamTitle').value;
  if (!title) return;
  var cid = document.getElementById('editCourseId').value;
  var defaultQuestions = JSON.stringify([
    { type: "single_choice", question: "示例选择题", options: ["A","B","C","D"], answer: "0", score: 25 },
    { type: "short_answer", question: "示例简答题", score: 25 }
  ]);
  fetch(API + '/courses/' + cid + '/exams', {
    method: 'POST', headers: auth(),
    body: JSON.stringify({ title: title, examType: 'chapter', questions: defaultQuestions, totalScore: 100, passingScore: 60, maxAttempts: 3 })
  })
    .then(function(r) { return r.json(); })
    .then(function() { document.getElementById('newExamTitle').value = ''; loadStructure(cid); });
}

function deleteExam(eid) {
  if (!confirm('删除此考试？')) return;
  var cid = document.getElementById('editCourseId').value;
  fetch(API + '/courses/' + cid + '/exams/' + eid, { method: 'DELETE', headers: auth() })
    .then(function() { loadStructure(cid); });
}

// ─── Grading ───
function loadGrading() {
  fetch(API + '/courses/gradings/pending', { headers: auth() })
    .then(function(r) { return r.json(); })
    .then(function(items) {
      var html = items.length ? items.map(function(g) {
        return '<div class="grading-card">' +
          '<div class="q">课程 #' + g.resultId + ' | 题目 #' + (g.questionIndex + 1) + '</div>' +
          '<div class="ans">' + esc(g.studentAnswer || '(未作答)') + '</div>' +
          '<div class="input-row">' +
            '<input type="number" min="0" max="100" placeholder="分数" id="g_score_' + g.id + '">' +
            '<input type="text" placeholder="批注（可选）" id="g_comment_' + g.id + '">' +
            '<button class="btn-primary" onclick="submitGrade(' + g.id + ')">提交评分</button>' +
          '</div></div>';
      }).join('') : '<p style="opacity:0.5;text-align:center;padding:40px">暂无待评分题目 🎉</p>';
      document.getElementById('gradingContainer').innerHTML = html;
    })
    .catch(function() {
      document.getElementById('gradingContainer').innerHTML = '<p style="opacity:0.5">加载失败</p>';
    });
}

function submitGrade(gid) {
  var score = parseInt(document.getElementById('g_score_' + gid).value);
  var comment = document.getElementById('g_comment_' + gid).value;
  if (isNaN(score)) { alert('请输入分数'); return; }
  fetch(API + '/courses/gradings/' + gid + '/grade', {
    method: 'POST', headers: auth(),
    body: JSON.stringify({ score: score, comment: comment })
  })
    .then(function() { loadGrading(); })
    .catch(function() { alert('提交失败'); });
}

// ─── Students ───
function populateStudentSelect() {
  var sel = document.getElementById('studentCourseSelect');
  sel.innerHTML = '<option value="">选择课程...</option>' +
    state.courses.map(function(c) { return '<option value="' + c.id + '">' + esc(c.title) + '</option>'; }).join('');
}

function loadStudents() {
  var cid = document.getElementById('studentCourseSelect').value;
  if (!cid) { document.getElementById('studentList').innerHTML = ''; return; }
  // For now, show enrollment count (detailed student list needs an API endpoint)
  var c = state.courses.find(function(x) { return x.id == cid; });
  document.getElementById('studentList').innerHTML =
    '<div class="student-row"><span class="name">总报名人数</span><span>' + (c.enrollmentCount || 0) + ' 人</span></div>' +
    '<div style="padding:12px;opacity:0.5;font-size:13px">详细学员列表需后端新增端点。当前可查看总人数。</div>';
}

// ─── Export ───
window.editCourse = editCourse;
window.manageStructure = manageStructure;
window.saveCourse = saveCourse;
window.resetForm = resetForm;
window.deleteCourse = deleteCourse;
window.addSection = addSection;
window.deleteSection = deleteSection;
window.updateSectionTitle = updateSectionTitle;
window.addLesson = addLesson;
window.deleteLesson = deleteLesson;
window.updateLessonTitle = updateLessonTitle;
window.updateLessonDuration = updateLessonDuration;
window.updateLessonType = updateLessonType;
window.addExam = addExam;
window.deleteExam = deleteExam;
window.submitGrade = submitGrade;
window.loadStudents = loadStudents;

})();
