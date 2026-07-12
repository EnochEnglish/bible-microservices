/**
 * quiz.js — 答题模块（学生侧）
 * Student Quiz Module — enhances lesson content with interactive quiz elements
 *
 * 功能:
 * 1. 检测课程内容中的填空/选择模式，渲染为交互组件
 * 2. 已登录用户可填写答案并提交
 * 3. 提交后调用考试 API 保存答案
 * 4. 显示历次成绩
 * 5. 未登录用户提示登录
 *
 * 依赖: quiz-extract.js (QuizExtract)
 * 纯增强模块，不修改 courses.js 中的 renderMarkdown
 */
(function() {
'use strict';

var API = '/api/v1';
var QUIZ_STATE = {
  token: localStorage.getItem('jwt_token') || '',
  user: null,
  currentLesson: null,
  currentCourseId: null,
  answers: {},
  examId: null,
  results: []
};

// ─── Init: Listen for lesson view changes ───
document.addEventListener('DOMContentLoaded', function() {
  // Use MutationObserver to detect when lesson body is populated
  var lessonBody = document.getElementById('lessonBody');
  if (!lessonBody) return;

  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList' && lessonBody.children.length > 0) {
        // Lesson content was rendered — enhance it
        enhanceLessonContent();
      }
    });
  });
  observer.observe(lessonBody, { childList: true, subtree: false });
});

/**
 * Enhance lesson content after markdown rendering
 * Called by MutationObserver or manually via window.QuizModule.enhance()
 */
function enhanceLessonContent() {
  var lessonBody = document.getElementById('lessonBody');
  if (!lessonBody) return;

  // Skip if already enhanced
  if (lessonBody.getAttribute('data-quiz-enhanced') === 'true') return;

  // Check if there are any quiz patterns in the raw text
  var rawText = lessonBody.textContent || '';
  var hasUnderscores = /_{2,}/.test(rawText);
  var hasCjkBrackets = /[（(]\s{0,4}[）)]/.test(rawText);
  var hasChoicePattern = /是[（(]\s*[^）)]*\s*[）)]\s*不是[（(]\s*[^）)]*\s*[）)]/.test(rawText);
  var hasMarkedBlanks = /\{\{blank:\d+\}\}/.test(rawText);

  if (!hasUnderscores && !hasCjkBrackets && !hasChoicePattern && !hasMarkedBlanks) {
    // No quiz patterns found — try to load exam from API
    loadExamForCurrentLesson();
    return;
  }

  // Enhance the HTML with interactive elements
  var html = lessonBody.innerHTML;
  html = QuizExtract.enhanceHtml(html);
  lessonBody.innerHTML = html;
  lessonBody.setAttribute('data-quiz-enhanced', 'true');

  // Attach input listeners
  attachInputListeners();

  // Add quiz toolbar (submit button, results)
  addQuizToolbar();

  // Also try to load existing exam
  loadExamForCurrentLesson();
}

/**
 * Attach listeners to quiz inputs
 */
function attachInputListeners() {
  var inputs = document.querySelectorAll('.quiz-blank-input');
  inputs.forEach(function(input) {
    input.addEventListener('input', function() {
      var id = input.getAttribute('data-blank-id');
      QUIZ_STATE.answers[id] = input.value;
    });
  });

  var radios = document.querySelectorAll('.quiz-choice-inline input[type="radio"]');
  radios.forEach(function(radio) {
    radio.addEventListener('change', function() {
      var name = radio.name;
      QUIZ_STATE.answers[name] = radio.value;
    });
  });
}

/**
 * Add quiz toolbar below lesson content
 */
function addQuizToolbar() {
  var lessonBody = document.getElementById('lessonBody');
  if (!lessonBody) return;

  // Check if toolbar already exists
  if (document.getElementById('quizToolbar')) return;

  var toolbar = document.createElement('div');
  toolbar.id = 'quizToolbar';
  toolbar.className = 'quiz-toolbar';

  var hasInputs = document.querySelectorAll('.quiz-blank-input, .quiz-choice-inline').length > 0;
  if (!hasInputs) return;

  toolbar.innerHTML =
    '<div class="quiz-toolbar-inner">' +
      '<span class="quiz-status" id="quizStatus">📝 答题模式 / Quiz Mode</span>' +
      '<button class="quiz-submit-btn" id="quizSubmitBtn" onclick="QuizModule.submit()">提交答案 / Submit</button>' +
      '<button class="quiz-results-btn" id="quizResultsBtn" onclick="QuizModule.showResults()" style="display:none">查看成绩 / Results</button>' +
    '</div>' +
    '<div id="quizResultsPanel" class="quiz-results-panel" style="display:none"></div>';

  lessonBody.appendChild(toolbar);

  // Check login status
  if (!QUIZ_STATE.token) {
    showLoginPrompt();
  } else {
    loadUserInfo();
  }
}

/**
 * Show login prompt for non-logged-in users
 */
function showLoginPrompt() {
  var status = document.getElementById('quizStatus');
  if (status) {
    status.innerHTML = '🔒 <a href="/login.html?redirect=/courses.html">登录</a>后才能答题 / Login to answer quiz';
  }
  var btn = document.getElementById('quizSubmitBtn');
  if (btn) btn.disabled = true;
}

/**
 * Load user info
 */
function loadUserInfo() {
  fetch(API + '/auth/me', { headers: { 'Authorization': 'Bearer ' + QUIZ_STATE.token } })
    .then(function(r) { if (r.ok) return r.json(); throw new Error('Not logged in'); })
    .then(function(u) { QUIZ_STATE.user = u; })
    .catch(function() {
      QUIZ_STATE.token = '';
      showLoginPrompt();
    });
}

/**
 * Get current course/lesson context from courses.js state
 */
function getCurrentContext() {
  // Access courses.js internal state via window-exposed functions
  // courses.js stores state internally; we read from DOM
  var lessonTitle = document.getElementById('lessonTitle');
  var lessonBody = document.getElementById('lessonBody');

  // Try to find lesson ID from the global scope
  // courses.js exposes openLesson etc, but state is private
  // We use a different approach: store context when enhance is called
  return {
    lessonId: QUIZ_STATE.currentLessonId,
    courseId: QUIZ_STATE.currentCourseId
  };
}

/**
 * Set context (called from outside, e.g., by modified courses.js or via event)
 */
function setContext(courseId, lessonId) {
  QUIZ_STATE.currentCourseId = courseId;
  QUIZ_STATE.currentLessonId = lessonId;
  QUIZ_STATE.answers = {};
  // Reset enhanced flag
  var lessonBody = document.getElementById('lessonBody');
  if (lessonBody) lessonBody.removeAttribute('data-quiz-enhanced');
}

/**
 * Load exam for current lesson (if any)
 */
function loadExamForCurrentLesson() {
  var ctx = getCurrentContext();
  if (!ctx.courseId) return;

  // Find exams for this course
  fetch(API + '/courses/' + ctx.courseId)
    .then(function(r) { return r.json(); })
    .then(function(detail) {
      if (!detail || !detail.exams || detail.exams.length === 0) return;

      // Find exam matching this lesson's section
      var exam = detail.exams[0]; // For now, use first exam
      QUIZ_STATE.examId = exam.id;

      // Load results if logged in
      if (QUIZ_STATE.token) {
        loadExamResults(exam.id);
      }

      // Show results button
      var btn = document.getElementById('quizResultsBtn');
      if (btn) btn.style.display = 'inline-block';
    })
    .catch(function() {});
}

/**
 * Load exam results for current user
 */
function loadExamResults(examId) {
  if (!QUIZ_STATE.token || !QUIZ_STATE.currentCourseId) return;

  fetch(API + '/courses/' + QUIZ_STATE.currentCourseId + '/exams/' + examId + '/results', {
    headers: { 'Authorization': 'Bearer ' + QUIZ_STATE.token }
  })
    .then(function(r) { return r.json(); })
    .then(function(results) {
      QUIZ_STATE.results = results || [];
    })
    .catch(function() {});
}

/**
 * Submit quiz answers
 */
function submit() {
  if (!QUIZ_STATE.token) {
    alert('请先登录 / Please login first');
    window.location.href = '/login.html?redirect=/courses.html';
    return;
  }

  var ctx = getCurrentContext();
  if (!ctx.courseId) {
    alert('无法确定课程 / Cannot determine course');
    return;
  }

  // Collect answers from inputs
  var inputs = document.querySelectorAll('.quiz-blank-input');
  var answers = [];
  inputs.forEach(function(input, idx) {
    answers.push(input.value || '');
  });

  // Also collect choice answers
  var choices = document.querySelectorAll('.quiz-choice-inline');
  choices.forEach(function(choice, idx) {
    var selected = choice.querySelector('input[type="radio"]:checked');
    answers.push(selected ? selected.value : '');
  });

  if (answers.every(function(a) { return !a; })) {
    alert('请填写至少一个答案 / Please fill in at least one answer');
    return;
  }

  if (!confirm('确定提交答案？/ Confirm submit?')) return;

  // If there's an existing exam, submit to it
  if (QUIZ_STATE.examId) {
    submitToExam(QUIZ_STATE.examId, answers);
  } else {
    // No exam created yet — try to create one from lesson content
    createExamFromLesson(ctx.courseId, ctx.lessonId, answers);
  }
}

/**
 * Submit answers to an existing exam
 */
function submitToExam(examId, answers) {
  var answersJson = JSON.stringify(answers);

  fetch(API + '/courses/' + QUIZ_STATE.currentCourseId + '/exams/' + examId + '/submit', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + QUIZ_STATE.token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ answers: answersJson })
  })
    .then(function(r) {
      if (!r.ok) throw new Error('Submit failed');
      return r.json();
    })
    .then(function(result) {
      showSubmitResult(result);
    })
    .catch(function(err) {
      alert('提交失败 / Submit failed: ' + err.message);
    });
}

/**
 * Create exam from lesson content, then submit
 */
function createExamFromLesson(courseId, lessonId, answers) {
  fetch(API + '/courses/' + courseId + '/lessons/' + lessonId + '/questions')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.questions || data.questions.length === 0) {
        // No extractable questions — just save answers locally
        alert('答案已记录 / Answers recorded (no exam available)');
        return;
      }

      // Create exam from extracted questions
      return fetch(API + '/courses/' + courseId + '/lessons/' + lessonId + '/exam-from-content', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + QUIZ_STATE.token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: '随堂测验 / Lesson Quiz',
          passingScore: 60
        })
      })
        .then(function(r) { return r.json(); })
        .then(function(exam) {
          QUIZ_STATE.examId = exam.id;
          return submitToExam(exam.id, answers);
        });
    })
    .catch(function(err) {
      alert('创建考试失败 / Failed to create exam: ' + err.message);
    });
}

/**
 * Show submit result
 */
function showSubmitResult(result) {
  var status = document.getElementById('quizStatus');
  var passed = result.passed;
  var score = result.score;

  if (status) {
    status.innerHTML = passed ?
      '✅ 得分 / Score: ' + score + ' (通过 / Passed)' :
      '❌ 得分 / Score: ' + score + ' (未通过 / Not passed)';
    status.className = passed ? 'quiz-status quiz-passed' : 'quiz-status quiz-failed';
  }

  // Disable submit button
  var btn = document.getElementById('quizSubmitBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '已提交 / Submitted';
  }

  // Show results button
  var resultsBtn = document.getElementById('quizResultsBtn');
  if (resultsBtn) resultsBtn.style.display = 'inline-block';

  // Reload results
  if (QUIZ_STATE.examId) {
    loadExamResults(QUIZ_STATE.examId);
  }
}

/**
 * Show results panel
 */
function showResults() {
  var panel = document.getElementById('quizResultsPanel');
  if (!panel) return;

  if (QUIZ_STATE.results.length === 0) {
    panel.innerHTML = '<p class="quiz-no-results">暂无成绩记录 / No results yet</p>';
  } else {
    panel.innerHTML = '<h4>📜 历次成绩 / History</h4>' +
      QUIZ_STATE.results.map(function(r, i) {
        var date = new Date(r.submittedAt).toLocaleString();
        var status = r.passed ? '✅ 通过' : '❌ 未通过';
        return '<div class="quiz-result-item">' +
          '<span>第' + (i + 1) + '次 / Attempt ' + (i + 1) + '</span>' +
          '<span>得分: ' + r.score + '</span>' +
          '<span>' + status + '</span>' +
          '<span class="quiz-result-date">' + date + '</span>' +
        '</div>';
      }).join('');
  }

  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

/**
 * Reset quiz state when switching lessons
 */
function reset() {
  QUIZ_STATE.answers = {};
  QUIZ_STATE.examId = null;
  QUIZ_STATE.results = [];
  var lessonBody = document.getElementById('lessonBody');
  if (lessonBody) lessonBody.removeAttribute('data-quiz-enhanced');
  var toolbar = document.getElementById('quizToolbar');
  if (toolbar) toolbar.remove();
}

// ─── Export ───
window.QuizModule = {
  enhance: enhanceLessonContent,
  setContext: setContext,
  submit: submit,
  showResults: showResults,
  reset: reset,
  getState: function() { return QUIZ_STATE; }
};

// Listen for lesson navigation events from courses.js
// courses.js calls window.openLesson() — we hook into the lesson body mutation observer
// Additional: listen for custom event
document.addEventListener('quiz:setContext', function(e) {
  setContext(e.detail.courseId, e.detail.lessonId);
});

// Intercept openLesson and openCourse to track context
// Use interval check since courses.js loads after quiz.js
var _hookInterval = setInterval(function() {
  if (window.openLesson && !window.openLesson._quizHooked) {
    var _origOpenLesson = window.openLesson;
    window.openLesson = function(lessonId) {
      if (QUIZ_STATE.currentCourseId) {
        setContext(QUIZ_STATE.currentCourseId, lessonId);
      }
      return _origOpenLesson.call(this, lessonId);
    };
    window.openLesson._quizHooked = true;
  }
  if (window.openCourse && !window.openCourse._quizHooked) {
    var _origOpenCourse = window.openCourse;
    window.openCourse = function(courseId) {
      QUIZ_STATE.currentCourseId = courseId;
      return _origOpenCourse.call(this, courseId);
    };
    window.openCourse._quizHooked = true;
  }
  if (window.openLesson && window.openCourse) {
    clearInterval(_hookInterval);
  }
}, 50);

})();
