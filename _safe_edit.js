// Node.js script to safely edit frontend files with UTF-8 no-BOM
// Avoids PowerShell Set-Content / write tool encoding corruption
const fs = require('fs');
const path = require('path');

const BASE = 'D:\\dev\\github\\bible-microservices\\frontend';
const utf8 = 'utf8';

// ============================================================
// 1. COMMENTARY_NAMES expansion for app.js
// ============================================================
const newZhApp = `var COMMENTARY_NAMES_ZH = {
  TSK: "TSK 交叉引用",
  JFB: "JFB 注释",
  MHCC: "Matthew Henry 简注",
  MHC: "Matthew Henry 全注",
  Clarke: "Adam Clarke 注释",
  Calvin: "加尔文注释",
  Barnes: "Barnes NT 注释",
  RWP: "Robertson 词图",
  Catena: "教父集注",
  Wesley: "Wesley 注释",
  Abbott: "Abbott NT 插图",
  Burkitt: "Burkitt 注释",
  CalvinCommentaries: "加尔文全集注释",
  DTN: "Darby 译本注释",
  Family: "Family Bible 注释",
  Geneva: "日内瓦圣经注释",
  KD: "KD 旧约注释",
  KingComments: "Kingcomments 全本注释",
  Lightfoot: "Lightfoot 注释",
  Luther: "路德注释选",
  MAK: "MAK 注释",
  NETnotesfree: "NET 圣经脚注",
  PNT: "人民新约注释",
  Personal: "个人注释",
  QuotingPassages: "经文引证",
  Rieger: "Rieger 注释",
  SBLGNTApp: "SBLGNT 校勘",
  Scofield: "Scofield 串珠",
  Sentiment: "圣经情感分析",
  Spurious: "Tischendorf 伪经",
  TDavid: "司布真大卫宝库",
  TFG: "四福音合参",
  VarApp: "NT 抄本异文",
  VulgGlossa: "Glossa 标准注疏"
};`;

const newEnApp = `var COMMENTARY_NAMES_EN = {
  TSK: "TSK Cross-Refs",
  JFB: "JFB Commentary",
  MHCC: "M.H. Concise",
  MHC: "M.H. Complete",
  Clarke: "Clarke's Commentary",
  Calvin: "Calvin's Commentary",
  Barnes: "Barnes NT Notes",
  RWP: "Robertson Word Pix",
  Catena: "Catena Aurea",
  Wesley: "Wesley's Notes",
  Abbott: "Abbott's Illustrated NT",
  Burkitt: "Burkitt's Notes",
  CalvinCommentaries: "Calvin's Collected Comm.",
  DTN: "Darby Translation Notes",
  Family: "Family Bible Notes",
  Geneva: "Geneva Bible Notes",
  KD: "Keil & Delitzsch (OT)",
  KingComments: "Kingcomments",
  Lightfoot: "Lightfoot Commentary",
  Luther: "Luther's Selected Comm.",
  MAK: "Matthias Ansorgs Komm.",
  NETnotesfree: "NET Bible Footnotes",
  PNT: "People's New Testament",
  Personal: "Personal Commentary",
  QuotingPassages: "Quoting Passages",
  Rieger: "Rieger's Commentary",
  SBLGNTApp: "SBLGNT Apparatus",
  Scofield: "Scofield Ref Notes",
  Sentiment: "Bible Sentiment Analysis",
  Spurious: "Tischendorf's Spurious",
  TDavid: "Spurgeon's Treasury",
  TFG: "Fourfold Gospel",
  VarApp: "NT Variant Apparatus",
  VulgGlossa: "Glossa Ordinaria"
};`;

// ============================================================
// 2. COMMENTARY_NAMES expansion for mobile.js
// ============================================================
const newZhMobile = `var COMMENTARY_NAMES_ZH = {
  'TSK':'TSK 交叉引用', 'JFB':'JFB 注释', 'MHCC':'Matthew Henry 简注',
  'MHC':'Matthew Henry 全注', 'Clarke':'Adam Clarke 注释', 'Calvin':'加尔文注释',
  'Barnes':'Barnes NT 注释', 'RWP':'Robertson 词图', 'Catena':'教父集注',
  'Wesley':'Wesley 注释',
  'Abbott':'Abbott NT 插图', 'Burkitt':'Burkitt 注释',
  'CalvinCommentaries':'加尔文全集注释', 'DTN':'Darby 译本注释',
  'Family':'Family Bible 注释', 'Geneva':'日内瓦圣经注释',
  'KD':'KD 旧约注释', 'KingComments':'Kingcomments 全本注释',
  'Lightfoot':'Lightfoot 注释', 'Luther':'路德注释选',
  'MAK':'MAK 注释', 'NETnotesfree':'NET 圣经脚注',
  'PNT':'人民新约注释', 'Personal':'个人注释',
  'QuotingPassages':'经文引证', 'Rieger':'Rieger 注释',
  'SBLGNTApp':'SBLGNT 校勘', 'Scofield':'Scofield 串珠',
  'Sentiment':'圣经情感分析', 'Spurious':'Tischendorf 伪经',
  'TDavid':'司布真大卫宝库', 'TFG':'四福音合参',
  'VarApp':'NT 抄本异文', 'VulgGlossa':'Glossa 标准注疏'
};`;

const newEnMobile = `var COMMENTARY_NAMES_EN = {
  'TSK':'TSK Cross-Refs', 'JFB':'JFB Commentary', 'MHCC':'M.H. Concise',
  'MHC':'M.H. Complete', 'Clarke':'Clarke\\'s Commentary', 'Calvin':'Calvin\\'s Commentary',
  'Barnes':'Barnes NT Notes', 'RWP':'Robertson Word Pix', 'Catena':'Catena Aurea',
  'Wesley':'Wesley\\'s Notes',
  'Abbott':'Abbott\\'s Illustrated NT', 'Burkitt':'Burkitt\\'s Notes',
  'CalvinCommentaries':'Calvin\\'s Collected Comm.', 'DTN':'Darby Translation Notes',
  'Family':'Family Bible Notes', 'Geneva':'Geneva Bible Notes',
  'KD':'Keil & Delitzsch (OT)', 'KingComments':'Kingcomments',
  'Lightfoot':'Lightfoot Commentary', 'Luther':'Luther\\'s Selected Comm.',
  'MAK':'Matthias Ansorgs Komm.', 'NETnotesfree':'NET Bible Footnotes',
  'PNT':'People\\'s New Testament', 'Personal':'Personal Commentary',
  'QuotingPassages':'Quoting Passages', 'Rieger':'Rieger\\'s Commentary',
  'SBLGNTApp':'SBLGNT Apparatus', 'Scofield':'Scofield Ref Notes',
  'Sentiment':'Bible Sentiment Analysis', 'Spurious':'Tischendorf\\'s Spurious',
  'TDavid':'Spurgeon\\'s Treasury', 'TFG':'Fourfold Gospel',
  'VarApp':'NT Variant Apparatus', 'VulgGlossa':'Glossa Ordinaria'
};`;

// ============================================================
// Edit: replace COMMENTARY_NAMES_ZH block in app.js
// ============================================================
{
  let content = fs.readFileSync(path.join(BASE, 'js', 'app.js'), utf8);
  
  // Replace COMMENTARY_NAMES_ZH (old 10-entry → new 35-entry)
  const oldZh = content.substring(
    content.indexOf('var COMMENTARY_NAMES_ZH = {'),
    content.indexOf('};', content.indexOf('var COMMENTARY_NAMES_ZH = {')) + 2
  );
  content = content.replace(oldZh, newZhApp);
  
  // Replace COMMENTARY_NAMES_EN (old 10-entry → new 35-entry)
  const oldEn = content.substring(
    content.indexOf('var COMMENTARY_NAMES_EN = {'),
    content.indexOf('};', content.indexOf('var COMMENTARY_NAMES_EN = {')) + 2
  );
  content = content.replace(oldEn, newEnApp);
  
  // Update version
  content = content.replace(/v=20260629e/g, 'v=20260701a');
  
  fs.writeFileSync(path.join(BASE, 'js', 'app.js'), content, utf8);
  console.log('app.js: COMMENTARY_NAMES expanded + version updated');
}

// ============================================================
// Edit: replace COMMENTARY_NAMES_ZH/EN blocks in mobile.js
// ============================================================
{
  let content = fs.readFileSync(path.join(BASE, 'm', 'mobile.js'), utf8);
  
  // Replace COMMENTARY_NAMES_ZH
  const oldZhM = content.substring(
    content.indexOf('var COMMENTARY_NAMES_ZH = {'),
    content.indexOf('};', content.indexOf('var COMMENTARY_NAMES_ZH = {')) + 2
  );
  content = content.replace(oldZhM, newZhMobile);
  
  // Replace COMMENTARY_NAMES_EN
  const oldEnM = content.substring(
    content.indexOf('var COMMENTARY_NAMES_EN = {'),
    content.indexOf('};', content.indexOf('var COMMENTARY_NAMES_EN = {')) + 2
  );
  content = content.replace(oldEnM, newEnMobile);
  
  // Update version
  content = content.replace(/v=20260629e/g, 'v=20260701a');
  
  fs.writeFileSync(path.join(BASE, 'm', 'mobile.js'), content, utf8);
  console.log('mobile.js: COMMENTARY_NAMES expanded + version updated');
}

// ============================================================
// 3. Update version in HTML files
// ============================================================
{
  let content = fs.readFileSync(path.join(BASE, 'index.html'), utf8);
  content = content.replace(/v=20260629e/g, 'v=20260701a');
  fs.writeFileSync(path.join(BASE, 'index.html'), content, utf8);
  console.log('index.html: version updated');
}

{
  let content = fs.readFileSync(path.join(BASE, 'm', 'index.html'), utf8);
  content = content.replace(/v=20260629e/g, 'v=20260701a');
  fs.writeFileSync(path.join(BASE, 'm', 'index.html'), content, utf8);
  console.log('m/index.html: version updated');
}

console.log('\nAll edits complete. UTF-8 no-BOM, no corruption.');
