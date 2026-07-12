/**
 * quiz-extract.js — 题目提取工具函数
 * 从课程内容文本中提取填空题/选择题模式
 * Extraction utility: parse fill-blank and choice patterns from lesson content
 *
 * 模式支持 / Pattern support:
 * 1. ____ (2+ underscores) → fill_blank
 * 2. （  ） Chinese full-width brackets → fill_blank
 * 3. () English brackets → fill_blank
 * 4. 是（）不是（） → single_choice
 * 5. {{blank:N}} markers → fill_blank (pre-marked)
 */
(function(global) {
'use strict';

/**
 * Extract questions from raw lesson content text
 * @param {string} content - Raw lesson content
 * @returns {Array} Array of question objects
 */
function extractQuestions(content) {
  if (!content) return [];
  var questions = [];
  var idx = 0;

  // ── Pattern 1: 是（）不是（） → single_choice ──
  var choiceRegex = /是[（(]\s*[^）)]*\s*[）)]\s*不是[（(]\s*[^）)]*\s*[）)]/g;
  var choiceMatches = content.match(choiceRegex) || [];
  var choiceRanges = [];
  choiceMatches.forEach(function(m) {
    var pos = content.indexOf(m);
    choiceRanges.push([pos, pos + m.length]);
    var innerRegex = /是[（(]\s*([^）)]*)\s*[）)]\s*不是[（(]\s*([^）)]*)\s*[）)]/;
    var innerMatch = m.match(innerRegex);
    var optA = innerMatch ? innerMatch[1].trim() : '';
    var optB = innerMatch ? innerMatch[2].trim() : '';
    idx++;
    questions.push({
      type: 'single_choice',
      question: m,
      options: [optA, optB],
      answer: 'A',
      score: 5,
      index: idx,
      sourceText: m
    });
  });

  // Mask choice ranges so we don't double-extract
  var masked = maskRanges(content, choiceRanges);

  // ── Pattern 2: ____ (2+ underscores) → fill_blank ──
  var underscoreRegex = /_{2,}/g;
  var um;
  while ((um = underscoreRegex.exec(masked)) !== null) {
    idx++;
    var context = getContext(masked, um.index, um.index + um[0].length, 80);
    questions.push({
      type: 'fill_blank',
      question: '...' + context + '...',
      answer: '',
      score: 5,
      index: idx,
      sourceText: um[0]
    });
  }

  // ── Pattern 3: （  ） Chinese brackets with 0-4 spaces inside → fill_blank ──
  var cjkRegex = /[（(]\s{0,4}[）)]/g;
  var cm;
  while ((cm = cjkRegex.exec(masked)) !== null) {
    var before = masked.substring(Math.max(0, cm.index - 10), cm.index);
    if (before.indexOf('是') >= 0 && before.indexOf('不是') >= 0) continue;
    var after = masked.substring(cm.index + cm[0].length, Math.min(masked.length, cm.index + cm[0].length + 20));
    if (after.match(/^\d/)) continue; // likely (约10:10) scripture reference

    idx++;
    var ctx = getContext(masked, cm.index, cm.index + cm[0].length, 80);
    questions.push({
      type: 'fill_blank',
      question: '...' + ctx + '...',
      answer: '',
      score: 5,
      index: idx,
      sourceText: cm[0]
    });
  }

  // ── Pattern 4: {{blank:N}} pre-marked fill blanks ──
  var markedRegex = /\{\{blank:(\d+)\}\}/g;
  var mm;
  while ((mm = markedRegex.exec(masked)) !== null) {
    idx++;
    var mctx = getContext(masked, mm.index, mm.index + mm[0].length, 80);
    questions.push({
      type: 'fill_blank',
      question: '...' + mctx + '...',
      answer: '',
      score: 5,
      index: idx,
      sourceText: mm[0],
      markedNumber: parseInt(mm[1], 10)
    });
  }

  return questions;
}

/**
 * Get surrounding context text for a match range
 */
function getContext(text, start, end, radius) {
  var s = Math.max(0, start - radius);
  var e = Math.min(text.length, end + radius);
  return text.substring(s, e).replace(/\n/g, ' ').trim();
}

/**
 * Mask specific ranges in text (replace with spaces) to prevent double-matching
 */
function maskRanges(text, ranges) {
  var chars = text.split('');
  ranges.forEach(function(r) {
    for (var i = r[0]; i < r[1] && i < chars.length; i++) {
      chars[i] = ' ';
    }
  });
  return chars.join('');
}

/**
 * Convert extracted questions to exam JSON format
 * (compatible with backend exam.questions field)
 */
function toExamJson(questions) {
  return JSON.stringify(questions.map(function(q) {
    var obj = {
      type: q.type,
      question: q.question,
      score: q.score
    };
    if (q.answer) obj.answer = q.answer;
    if (q.options) obj.options = q.options;
    return obj;
  }));
}

/**
 * Render lesson content with interactive quiz elements
 * Replaces ____ and （  ） with <input> elements in HTML
 * @param {string} html - Already rendered HTML (from markdown)
 * @returns {string} Enhanced HTML with input elements
 */
function enhanceHtml(html) {
  // Replace ____ with input
  html = html.replace(/_{2,}/g, function(m) {
    var id = 'blank-' + Math.random().toString(36).substr(2, 9);
    return '<input type="text" class="quiz-blank-input" data-blank-id="' + id + '" placeholder="填空 / fill in">';
  });

  // Replace 是（）不是（） with radio buttons
  html = html.replace(/是[（(]\s*([^）)]*)\s*[）)]\s*不是[（(]\s*([^）)]*)\s*[）)]/g, function(m, a, b) {
    var id = 'choice-' + Math.random().toString(36).substr(2, 9);
    return '<span class="quiz-choice-inline" data-choice-id="' + id + '">' +
      '是<label class="quiz-radio"><input type="radio" name="' + id + '" value="A">' + a + '</label>' +
      '不是<label class="quiz-radio"><input type="radio" name="' + id + '" value="B">' + b + '</label></span>';
  });

  // Replace （  ） standalone Chinese brackets with input (skip scripture refs)
  html = html.replace(/[（(]\s{0,4}[）)]/g, function(m, offset, full) {
    // Check if preceded by 是 or 不是
    var before = full.substring(Math.max(0, offset - 10), offset);
    if (before.indexOf('是') >= 0 && before.indexOf('不是') >= 0) return m;

    // Check if followed by digit (scripture reference like (约10:10))
    var after = full.substring(offset + m.length, Math.min(full.length, offset + m.length + 5));
    if (after.match(/^\d/)) return m;

    var id = 'cjk-blank-' + Math.random().toString(36).substr(2, 9);
    return '<input type="text" class="quiz-blank-input quiz-blank-cjk" data-blank-id="' + id + '" placeholder="（ ）">';
  });

  // Replace {{blank:N}} markers with inputs
  html = html.replace(/\{\{blank:(\d+)\}\}/g, function(m, num) {
    var id = 'marked-blank-' + num;
    return '<input type="text" class="quiz-blank-input quiz-blank-marked" data-blank-id="' + id + '" data-blank-num="' + num + '" placeholder="填空' + num + '">';
  });

  return html;
}

// Export
global.QuizExtract = {
  extractQuestions: extractQuestions,
  toExamJson: toExamJson,
  enhanceHtml: enhanceHtml,
  getContext: getContext,
  maskRanges: maskRanges
};

})(typeof window !== 'undefined' ? window : globalThis);
