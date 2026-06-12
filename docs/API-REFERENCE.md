# API 参考

## 基础信息

- **Gateway**: http://localhost:8080
- **前端代理**: 所有 /api/* 请求由 rontend/server.js 转发到 Gateway
- **响应格式**: JSON
- **字符编码**: UTF-8

## Gateway 路由表

| 前缀 | 目标服务 | 端口 |
|------|---------|------|
| /api/v1/bible/* | bible-text-service | 8081 |
| /api/v1/text/* | bible-text-service | 8081 |
| /api/v1/strongs/* | bible-text-service | 8081 |
| /api/v1/annotations/* | bible-text-service | 8081 |
| /api/v1/search/* | bible-search-service | 8082 |
| /api/v1/sword/* | bible-sword-service | 8086 |

---

## 圣经正文 API

### 获取译本列表
`
GET /api/v1/bible/translations
`
**响应**:
`json
["asv", "bbe", "cuv_gb", "cuv_tw", "dby", "kjv", "wbt", "web", "ylt", ...]
`

### 获取书卷列表
`
GET /api/v1/bible/{translation}/books
`
**响应**:
`json
[
  {"id": "gen", "name": "Genesis", "chapters": 50, "order_index": 1},
  {"id": "exo", "name": "Exodus", "chapters": 40, "order_index": 2},
  ...
]
`

### 获取章节经文
`
GET /api/v1/bible/{translation}/{book}/{chapter}
GET /api/v1/bible/{translation}/{book}/{chapter}/{verse}
`
**响应**:
`json
[
  {"verse": 1, "text": "In the beginning God created..."},
  {"verse": 2, "text": "And the earth was without form..."},
  ...
]
`

### 随机经文
`
GET /api/v1/bible/{translation}/random
`
**响应**:
`json
{"book": "gen", "chapter": 1, "verse": 1, "text": "In the beginning...", "reference": "Genesis 1:1"}
`

### 范围查询
`
GET /api/v1/bible/{translation}/range?start=gen.1.1&end=gen.1.5
`

---

## Interlinear API

### 获取逐词对照数据
`
GET /api/v1/bible/{translation}/interlinear/{book}/{chapter}
GET /api/v1/bible/{translation}/interlinear/{book}/{chapter}/{verse}
`
**响应**:
`json
[
  {"verse": 1, "words": [
    {"text": "In the beginning", "strongs": "H7225", "morph": "H-B-N-"},
    ...
  ]}
]
`

---

## SWORD 模块 API

### 列出已安装模块
`
GET /api/v1/sword/modules
`
**响应**:
`json
{
  "total": 25,
  "modules": [
    {
      "initials": "KJV",
      "name": "King James Version (1769) with Strongs",
      "category": "BIBLE",
      "language": "en"
    },
    ...
  ]
}
`

### 获取模块信息
`
GET /api/v1/sword/modules/{initials}
`

### 获取模块书卷
`
GET /api/v1/sword/modules/{initials}/books
`

### 重新加载模块
`
POST /api/v1/sword/reload
`

---

## SWORD 经文 API

### 获取 SWORD 模块经文
`
GET /api/v1/sword/{module}/passage/{reference}
GET /api/v1/sword/{module}/passage/{reference}/strongs
`
**说明**:
- module: 模块 initials (如 KJV, ChiUns)
- eference: 格式 Book.Chapter.Verse (如 Gen.1.1)
- 带 /strongs 后缀返回含 Strong's 编号的逐词数据

---

## SWORD 词典 API

### 查询词典条目
`
GET /api/v1/sword/{module}/dict/{key}
`
**说明**: module 如 StrongsGreek, StrongsHebrew, ISBE, Easton

### 搜索词典
`
GET /api/v1/sword/{module}/dict/search?q={query}
`

---

## SWORD GenBook API

### 获取键列表（灵修/通用书）
`
GET /api/v1/sword/genbook/{module}/keys
`
**响应** (灵修模块):
`json
{
  "module": "SME",
  "keys": ["01.01", "01.02", ..., "12.31"],
  "total": 366
}
`

### 获取内容
`
GET /api/v1/sword/genbook/{module}/content?key={key}
`
**响应**:
`json
{
  "module": "SME",
  "key": "06.13",
  "title": "Morning, June 13",
  "content": "... OSIS XML content ..."
}
`

---

## 模块安装 API

### 列出仓库源
`
GET /api/v1/sword/install/sources
`
**响应**:
`json
[
  {"id": "crosswire", "name": "CrossWire Main", "type": "sword-https", ...},
  {"id": "crosswire-beta", "name": "CrossWire Beta", ...},
  ...
]
`

### 浏览可安装模块
`
GET /api/v1/sword/install/available?source=crosswire&category=BIBLE&search=kjv
`
**参数**:
- source (默认 "crosswire"): 仓库 ID
- category: 分类过滤 (BIBLE/COMMENTARY/DICTIONARY/DAILY_DEVOTION/GENERAL_BOOK/CULT/MAPS/GLOSSARY)
- search: 全文搜索

**响应**:
`json
{
  "source": "crosswire",
  "total": 275,
  "byCategory": {"BIBLE": 275, ...},
  "modules": [
    {
      "name": "KJV",
      "description": "King James Version (1769) with Strongs Numbers",
      "category": "BIBLE",
      "language": "en",
      "version": "1.8",
      "installed": true
    },
    ...
  ]
}
`

### 安装模块
`
POST /api/v1/sword/install
Content-Type: application/json

{"source": "crosswire", "module": "ESV2011"}
`
**响应**:
`json
{"success": true, "module": "ESV2011", "message": "Module 'ESV2011' installed."}
`

### 查看安装状态
`
GET /api/v1/sword/install/status
GET /api/v1/sword/install/status?module=ESV2011
`

---

## Strong's API

### 查询 Strong's 编号
`
GET /api/v1/strongs/{id}
`
**说明**: id 格式 H{number} 或 G{number} (如 H7225, G5547)

**响应**:
`json
{
  "id": "H7225",
  "original": "רֵאשִׁית",
  "transliteration": "re'shiyth",
  "pronunciation": "ray-sheeth'",
  "definition": "beginning, chief, first",
  "kjv_def": "beginning 18, firstfruits 11, first 9, chief 8, ..."
}
`

### 搜索 Strong's
`
GET /api/v1/strongs/search?q=beginning
GET /api/v1/strongs/stats
`

---

## 注释 API

### 获取注释源列表
`
GET /api/v1/annotations/commentary-sources
`

### 获取章节注释
`
GET /api/v1/annotations/commentaries/{book}/{chapter}
`

**响应**:
`json
[
  {
    "source": "MHCC",
    "bookId": "gen",
    "chapter": 1,
    "text": "... commentary text ..."
  }
]
`

---

## 搜索 API

### 全文搜索
`
GET /api/v1/search/{translation}?query={query}
`

### 搜索建议
`
GET /api/v1/search/suggest?q={partial}
`

### 重建索引
`
POST /api/v1/search/index/{translation}
`

---

## 笔记 API

### 获取笔记
`
GET /api/v1/text/notes/{verseRef}
`
**说明**: erseRef 格式 gen.1.1

### 创建笔记
`
POST /api/v1/text/notes
Content-Type: application/json

{"verseRef": "gen.1.1", "content": "创造论的关键经文"}
`

### 删除笔记
`
DELETE /api/v1/text/notes/{id}
`

---

## 书签 API

### 获取书签
`
GET /api/v1/text/bookmarks/{verseRef}
`

### 添加书签
`
POST /api/v1/text/bookmarks
Content-Type: application/json

{"verseRef": "gen.1.1", "label": "创造"}
`

### 删除书签
`
DELETE /api/v1/text/bookmarks/{id}
`

---

## 交叉引用 API

### 获取 TSK 交叉引用
`
GET /api/v1/text/crossrefs?ref=gen.1.1
`
**响应**:
`json
{
  "ref": "gen.1.1",
  "crossRefs": ["psa.33.6", "psa.102.25", "isa.44.24", "jhn.1.1", "heb.11.3"]
}
`
**说明**: 当前为硬编码的 TSK 数据，覆盖大多数常用经文。