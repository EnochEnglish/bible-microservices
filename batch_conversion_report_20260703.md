# 本地电子书批量转换报告

**日期：** 2026-07-03  
**版本：** v=20260703a  
**Git commit：** (待推送)

## 概况

将 `D:\dev\usebible.com\html\` 下的本地中文基督教电子书批量转换为静态 JSON 格式，集成到图书馆页面。

- **转换书籍：** 30 本
- **总章节数：** 642 章
- **数据大小：** 9.6 MB
- **跳过重复：** 2 本（天路历程英文、与神同在英文 — SWORD 已有）
- **输出目录：** `frontend/library-data/`

## 分类与书目

### 📖 解经问题（2本，218章）
| 代码 | 书名 | 作者 | 章节数 |
|------|------|------|--------|
| bible_wenti | 圣经问题解答 | 陈终道 | 183 |
| dsz | 圣经中的得胜者 | 佚名 | 35 |

### 🎤 讲道（1本，7章）
| 代码 | 书名 | 作者 | 章节数 |
|------|------|------|--------|
| deshen | 讲道集 | 佚名 | 7 |

### 🏜️ 灵修（7本，171章）
| 代码 | 书名 | 作者 | 章节数 |
|------|------|------|--------|
| hmgq | 荒漠甘泉 | 考门夫人 | 38 |
| walk_with_lord | 每日与主同行 | 佚名 | 54 |
| ptsdmm | 葡萄树的秘密 | 佚名 | 13 |
| listening | 倾听恩主的声音 | 佚名 | 12 |
| quanwei | 劝慰之言 | 佚名 | 25 |
| victory_life | 胜利生活的秘诀 | 佚名 | 16 |
| jabez | 雅比斯的祷告 | 魏肯生 | 13 |

### ⛪ 经典著作（4本，94章）
| 代码 | 书名 | 作者 | 章节数 |
|------|------|------|--------|
| tongzai | 与神同在 | 劳伦斯弟兄 | 23 |
| kneeling | 跪着的基督徒 | 佚名 | 29 |
| martyr_ch | 殉道史（中文） | 福克斯 | 19 |
| martyrs | Fox's Book of Martyrs (EN) | John Foxe | 23 |

### 📚 神学（1本，46章）
| 代码 | 书名 | 作者 | 章节数 |
|------|------|------|--------|
| xtsx | 系统神学 | 佚名 | 46 |

### ❤️ 家庭婚姻（15本，309章）
| 代码 | 书名 | 作者 | 章节数 |
|------|------|------|--------|
| aizhiyu | 爱之语 | 盖瑞·巧门 | 17 |
| bless_children | 蒙福的儿女 | 佚名 | 56 |
| ccdsm | 传承的生命 | 佚名 | 20 |
| clsks | 从零岁开始 | 佚名 | 16 |
| flower | 花篮缘 | 佚名 | 13 |
| gshznzb | 告诉孩子，你真棒！ | 卢勤 | 5 |
| hywtjd | 婚姻问题解答 | 佚名 | 10 |
| keys | 开启幸福婚姻的钥匙 | 佚名 | 1 |
| kzndqg | 控制你的情感 | 佚名 | 12 |
| marriage | 信徒离婚原则汇编 | 佚名 | 4 |
| sday_men | 圣地爱语 | 佚名 | 31 |
| shufeiyun | 属飞云 | 佚名 | 74 |
| teamwork | 建立婚姻中的协调合作 | 佚名 | 16 |
| wrfmwrsb | 为人父母为人师表 | 佚名 | 7 |
| yubeiqincunqi | 预备青春期 | 佚名 | 7 |

## 跳过的重复书目

| 源路径 | 原因 |
|--------|------|
| classic/pilgrim-en | SWORD 已有 Pilgrim's Progress |
| classic/tongzai-en | SWORD 已有 Practice of the Presence |

## 技术实现

### 转换脚本
- `convert-all-books.js` — 通用转换器，递归扫描 HTML 文件，提取标题和正文，清洗旧式 HTML 标签
- `gen-static-books.js` — 从 meta.json 生成 STATIC_BOOKS 数组

### 数据格式
每本书一个目录 `frontend/library-data/{code}/`：
- `meta.json` — 书籍元数据（标题、作者、分类、章节列表）
- `001.json`, `002.json`, ... — 各章节内容

### 前端集成
- `library.js` 中 `STATIC_BOOKS` 数组注册全部 30 本书
- `library.html` 筛选栏新增 6 个分类按钮：解经/灵修/经典/神学/家庭/讲道
- 通过 `fetch('library-data/{code}/meta.json')` 加载书籍
- 通过 `fetch('library-data/{code}/{id}.json')` 加载章节

### 与 SWORD 模块的关系
图书馆页面同时展示：
- **SWORD GenBook 模块**（31本英文经典 + 3本灵修 + 1篇论文）
- **静态 JSON 书籍**（30本中文电子书）
两类数据源统一在书架页面展示，用户无需区分。

## 数据来源
所有源文件来自 WellsOfGrace.com（丰盛恩典网站），本地保存在 `D:\dev\usebible.com\html\`。
