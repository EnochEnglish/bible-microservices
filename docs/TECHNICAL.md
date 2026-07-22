# Bible Microservices — 技术文档

> 版本：v1.0 | 更新日期：2026-07-23 | 适用版本：v=20260722c

---

## 目录

1. [系统架构](#1-系统架构)
2. [后端架构](#2-后端架构)
3. [前端架构](#3-前端架构)
4. [数据模型](#4-数据模型)
5. [API 参考](#5-api-参考)
6. [知识库系统](#6-知识库系统)
7. [认证与安全](#7-认证与安全)
8. [国际化（i18n）](#8-国际化i18n)
9. [配置参考](#9-配置参考)
10. [编译与部署](#10-编译与部署)
11. [编码规范](#11-编码规范)

---

## 1. 系统架构

### 1.1 架构总览

```
┌─────────────────────────────────────────────────────────┐
│                     浏览器                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  桌面版      │  │  手机版      │  │  插件页面    │     │
│  │  index.html │  │  m/index    │  │  KB/Dict    │     │
│  │  + app.js   │  │  + mobile   │  │  + courses  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
          │ HTTP                         │ HTTP
          ▼                              ▼
┌─────────────────┐          ┌─────────────────────┐
│  前端 Node.js    │          │  后端 Spring Boot    │
│  (:3000)         │          │  (:8080)             │
│                  │          │                      │
│  ┌─────────────┐│          │  ┌────────────────┐  │
│  │ server.js   ││  API 代理 │  │ 22 Controllers  │  │
│  │ 静态文件     │├─────────▶│  │ 17 Services    │  │
│  └─────────────┘│          │  │ 21 JPA Entities │  │
│  ┌─────────────┐│          │  └────────────────┘  │
│  │ Zvec 向量 DB ││          │  ┌────────────────┐  │
│  │ 433K 向量    ││          │  │  H2 数据库      │  │
│  │ BIN 持久化   ││          │  │  231MB         │  │
│  └─────────────┘│          │  └────────────────┘  │
│  ┌─────────────┐│          │  ┌────────────────┐  │
│  │ BGE 模型    ││          │  │  JSword         │  │
│  │ transformers ││         │  │  123 模块       │  │
│  └─────────────┘│          │  └────────────────┘  │
└─────────────────┘          └─────────────────────┘
```

### 1.2 技术栈

| 层 | 技术 | 版本 |
|----|------|------|
| 后端框架 | Spring Boot | 3.x |
| 编程语言 | Kotlin | 1.9 |
| 数据库 | H2 | 2.2.x |
| ORM | Spring Data JPA / Hibernate | - |
| 圣经引擎 | JSword | - |
| 缓存 | Caffeine | - |
| 认证 | JWT (jjwt) | - |
| 前端框架 | 无（原生 HTML/CSS/JS） | - |
| 前端服务 | Node.js | 16+ |
| 向量数据库 | Zvec（自研） | - |
| 嵌入模型 | transformers.js (Xenova) | - |
| 反向代理 | nginx | 1.18+ |
| JVM | JDK | 17+ |

### 1.3 项目结构

```
bible-microservices/
├── bible-monolith/                          # 后端单体
│   ├── src/main/kotlin/com/bible/monolith/
│   │   ├── controller/                      # REST API 控制器（22个）
│   │   ├── service/                         # 业务逻辑（17个）
│   │   ├── model/                           # JPA 实体（21个）
│   │   ├── repository/                      # 数据访问
│   │   ├── dto/                             # 数据传输对象
│   │   ├── security/                        # JWT 认证
│   │   ├── config/                          # 配置类
│   │   └── kb/                              # 知识库模块
│   │       ├── controller/
│   │       ├── service/
│   │       ├── model/
│   │       ├── repository/
│   │       └── embedding/
│   ├── src/main/resources/
│   │   ├── application.yml                   # 主配置
│   │   └── reading-plans/                    # 读经计划 JSON
│   └── build/libs/bible-monolith.jar         # 编译产物
├── frontend/                                 # 前端
│   ├── index.html                            # 桌面版
│   ├── m/                                    # 手机版
│   ├── js/                                   # JavaScript 模块
│   ├── css/                                  # 样式
│   ├── library-data/                         # 图书馆数据
│   ├── plugins/                              # 插件
│   │   └── knowledge-base/                  # 知识库页面
│   ├── data/                                 # Zvec BIN 文件
│   ├── zvec-bridge.js                        # 向量数据库桥接
│   └── server.js                             # Node.js 静态服务
├── data/sword-mods/                          # SWORD 模块
├── docs/                                     # 文档
└── README.md
```

---

## 2. 后端架构

### 2.1 控制器层（22 个 Controller）

| Controller | 基路径 | 主要功能 |
|-----------|--------|----------|
| AdminController | /api/v1/admin | 用户管理（列表/创建/改角色/重置密码/禁用） |
| AnnotationController | /api/v1/annotations | 注释、词典、书签、笔记、交叉引用 |
| AuthController | /api/v1/auth | 注册、登录、个人信息、改密 |
| BibleController | /api/v1/bible | 经文、译本、书籍、Interlinear |
| BookmarkController | /api/v1/bookmarks | 书签 CRUD |
| CaptchaController | /api/v1/auth/captcha | 验证码生成 |
| CourseController | /api/v1/courses | 课程 CRUD、报名、课时、考试、阅卷、证书 |
| CrossRefController | /api/v1/crossrefs | 交叉引用查询 |
| DictionaryController | /api/v1/dictionaries | H2 词典查询 |
| GenBookController | /api/v1/genbook | 灵修/通用书 |
| LessonQuestionController | /api/v1/courses | 课程题目管理 |
| ModuleController | /api/v1/modules | 模块管理 |
| ModuleInstallController | /api/v1/sword | SWORD 模块安装 |
| NoteController | /api/v1/notes | 笔记 CRUD |
| OrganizationController | /api/v1/organizations | 组织管理 |
| ReadingPlanController | /api/v1/reading-plans | 读经计划 |
| SearchController | /api/v1/search | 全文搜索 |
| SettingsController | /api/v1/settings | 系统设置 |
| StrongsController | /api/v1/strongs | Strong's 词典 |
| SwordDictionaryController | /api/v1/sword | SWORD 词典直读 |
| SwordModuleController | /api/v1/sword | SWORD 模块列表 |
| SwordPassageController | /api/v1/sword | SWORD 经文直读 |

### 2.2 服务层（17 个 Service）

| Service | 职责 |
|---------|------|
| AnnotationService | 注释/词典/书签/笔记数据访问 |
| AuthService | JWT 认证、用户注册/登录 |
| BibleSearchService | Lucene 全文搜索 |
| BibleTextService | H2 经文查询 |
| CourseService | 课程/课时/考试/证书逻辑 |
| CrossRefData | 交叉引用数据 |
| DictionaryService | H2 词典查询 |
| DomainConfigService | 领域配置 |
| GenBookService | 灵修/通用书（JSword） |
| ModuleInstallService | SWORD 模块安装 |
| ModuleService | 模块列表管理 |
| OrganizationService | 组织管理 |
| ReadingPlanService | 读经计划逻辑 |
| StrongsService | Strong's 词典查询 |
| SwordCommentaryService | SWORD 注释直读 |
| SwordPassageService | SWORD 经文直读 |
| SwordRegistry | SWORD 模块注册 |

### 2.3 知识库模块

```
com.bible.monolith.kb/
├── controller/
│   └── KbController.kt              # KB API 端点
├── service/
│   ├── KbEmbeddingService.kt         # 嵌入模型路由
│   ├── KbIndexService.kt            # 索引构建
│   └── KbSearchService.kt           # 搜索服务
├── model/
│   ├── KbDocument.kt                # 文档实体
│   ├── KbIndexConfig.kt            # 索引配置
│   └── SearchResult.kt             # 搜索结果 DTO
├── repository/
│   ├── KbDocumentRepository.kt      # JPA Repository
│   └── KbIndexConfigRepository.kt
└── embedding/
    ├── EmbeddingProvider.kt          # 嵌入接口
    ├── TfidfHashEmbedding.kt        # TF-IDF 256d 本地
    └── RemoteSemanticEmbedding.kt   # BGE HTTP 远程
```

### 2.4 缓存策略

```yaml
spring.cache:
  type: caffeine
  caffeine.spec: maximumSize=500, expireAfterAccess=30m
```

关键缓存：
- `@Cacheable("modules")` — SWORD 模块列表
- `@Cacheable("module-detail")` — 模块详情
- `@Cacheable("bible-books")` — 书卷列表
- `@CacheEvict(value=["modules","module-detail","bible-books"], allEntries=true)` — 安装/删除模块时清除

---

## 3. 前端架构

### 3.1 前端文件结构

| 文件 | 大小 | 说明 |
|------|------|------|
| index.html | 23KB | 桌面版主页 |
| js/app.js | 170KB | 桌面版主逻辑 |
| js/config.js | 2.4KB | 配置（basePath 自动检测） |
| js/api.js | 1.5KB | API 封装 |
| js/morphology.js | 8.6KB | 形态学数据 |
| css/style.css | 52KB | 桌面版样式 |
| m/index.html | - | 手机版主页 |
| m/mobile.js | - | 手机版逻辑 |
| m/mobile.css | - | 手机版样式 |
| dictionary.html | 2.1KB | 词典独立页 |
| js/dictionary.js | 12KB | 词典逻辑 |
| courses.html | 4.5KB | 课程页面 |
| js/courses.js | 19KB | 课程逻辑 |
| js/quiz.js | 14KB | 答题模块 |
| js/quiz-extract.js | 7KB | 题目提取 |
| js/grading.js | 14KB | 阅卷模块 |
| library.html | 3.5KB | 图书馆页面 |
| js/library.js | 19KB | 图书馆逻辑 |
| plugins/knowledge-base/index.html | 15KB | 知识库搜索 UI |
| server.js | - | Node.js 静态服务+API 代理 |
| zvec-bridge.js | - | 向量数据库桥接 |

### 3.2 server.js

功能：
1. 静态文件服务（端口 3000）
2. API 代理：`/api/*` → `http://localhost:8080`
3. SWORD 直连：`/sword/*` → `http://localhost:8086`（Gateway 不支持的端点）
4. 目录路由：`/m/` → 手机版
5. `/library/book/` 路由
6. 目录检测：路径以 `/` 结尾自动 serve index.html

### 3.3 前端状态管理

```javascript
var state = {
  // 当前状态
  currentTranslation: 'web',
  currentBook: 'gen',
  currentChapter: 1,
  lang: 'bilingual',  // 'zh' | 'en' | 'bilingual'
  
  // 数据
  translations: [],
  books: [],
  verses: [],
  interlinearData: null,
  commentaries: { sources: [], commentaries: [] },
  
  // UI 状态
  interlinear: false,
  compareMode: false,
  compareTranslations: [],
  
  // 用户
  user: null,
  token: null
};
```

### 3.4 basePath 动态检测

```javascript
// config.js
var basePath = location.pathname.startsWith('/bible/') ? '/bible' : '';
// 通过 document.write 设置 <base> 标签
document.write('<base href="' + basePath + '/">');
```

---

## 4. 数据模型

### 4.1 实体关系图

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ TRANSLATIONS │     │    BOOKS     │     │   VERSES     │
│──────────────│     │──────────────│     │──────────────│
│ ID (PK)      │◀───│ ID (PK)      │◀───│ ID (PK)      │
│ CODE         │    │ TRANSLATION_ID│   │ BOOK_ID (FK) │
│ NAME         │    │ BOOK_ID      │     │ CHAPTER      │
│ LANGUAGE     │    │ NAME         │     │ VERSE        │
│ YEAR         │    │ ENGLISH_NAME │     │ TEXT         │
└──────────────┘    │ OSIS_ID      │     │ VERSE_KEY    │
                    │ ORDER_INDEX  │     └──────────────┘
                    │ CHAPTER_COUNT│
                    └──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    WORDS     │     │DICTIONARY_   │     │ COMMENTARIES │
│              │     │ ENTRIES      │     │              │
│──────────────│     │──────────────│     │──────────────│
│ ID (PK)      │     │ ID (PK)      │     │ ID (PK)      │
│ VERSE_ID(FK)│     │ SOURCE       │     │ BOOK_ID      │
│ STRONG_ID    │     │ ENTRY_ID     │     │ CHAPTER      │
│ MORPH        │     │ TEXT         │     │ VERSE_START  │
│ TEXT         │     │ …            │     │ CONTENT      │
└──────────────┘     └──────────────┘     └──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    USERS     │     │  COURSES     │     │COURSE_LESSONS│
│──────────────│     │──────────────│     │──────────────│
│ ID (PK)      │     │ ID (PK)      │     │ ID (PK)      │
│ USERNAME     │     │ TITLE        │     │ COURSE_ID(FK)│
│ PASSWORD_HASH│    │ DESCRIPTION  │     │ SECTION_ID   │
│ ROLE         │     │ STATUS       │     │ TITLE        │
│ ENABLED      │     │ DIFFICULTY   │     │ CONTENT      │
│ ORG_ID (FK)  │     │ DOMAIN       │     │ ORDER_INDEX  │
└──────────────┘     └──────────────┘     └──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│COURSE_EXAMS  │     │COURSE_EXAM_  │     │COURSE_CERT- │
│              │     │ RESULTS      │     │ IFICATES     │
│──────────────│     │──────────────│     │──────────────│
│ ID (PK)      │     │ ID (PK)      │     │ ID (PK)      │
│ COURSE_ID(FK)│    │ EXAM_ID (FK) │     │ COURSE_ID    │
│ TITLE        │     │ USER_ID (FK) │     │ USER_ID      │
│ PASS_SCORE   │     │ ANSWERS      │     │ CERT_CODE    │
│ MAX_ATTEMPTS │     │ SCORE        │     │ ISSUED_AT    │
└──────────────┘     │ PASSED       │     └──────────────┘
                     └──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ KB_DOCUMENTS │     │BOOKMARKS     │     │ NOTES        │
│──────────────│     │──────────────│     │──────────────│
│ ID (PK)      │     │ ID (PK)      │     │ ID (PK)      │
│ SOURCE_TYPE  │     │ USER_ID (FK) │     │ USER_ID (FK) │
│ SOURCE_REF   │     │ VERSE_REF    │     │ VERSE_REF    │
│ CHUNK_INDEX  │     │ LABEL        │     │ CONTENT      │
│ CONTENT      │     │ CREATED_AT   │     │ CREATED_AT   │
│ EMBEDDING_   │     └──────────────┘     └──────────────┘
│ MODEL        │
│ VEC_ID       │     ┌──────────────┐     ┌──────────────┐
│ TITLE        │     │ORGANIZATIONS │     │DOMAIN_CONFIG│
│ META_JSON    │     │──────────────│     │──────────────│
└──────────────┘     │ ID (PK)      │     │ ID (PK)      │
                     │ NAME         │     │ DOMAIN       │
                     │ TYPE         │     │ ORG_TYPE     │
                     │ PARENT_ID    │     │ DIFFICULTY   │
                     └──────────────┘     └──────────────┘
```

### 4.2 关键实体说明

| 实体 | 表名 | 说明 |
|------|------|------|
| Translation | TRANSLATIONS | 译本（22+） |
| Book | BOOKS | 书卷（每译本 66 卷） |
| Verse | VERSES | 经文（每节一行） |
| Word | WORDS | 逐词数据（Strong's + morph） |
| DictionaryEntry | DICTIONARY_ENTRIES | 词典条目 |
| Commentary | COMMENTARIES | 注释 |
| User | USERS | 用户 |
| Course | COURSES | 课程 |
| CourseSection | COURSE_SECTIONS | 课程章节 |
| CourseLesson | COURSE_LESSONS | 课时 |
| CourseLessonProgress | COURSE_LESSON_PROGRESS | 课时进度 |
| CourseExam | COURSE_EXAMS | 考试 |
| CourseExamResult | COURSE_EXAM_RESULTS | 考试结果 |
| CourseExamGrading | COURSE_EXAM_GRADING | 阅卷记录 |
| CourseCertificate | COURSE_CERTIFICATES | 证书 |
| CourseEnrollment | COURSE_ENROLLMENTS | 选课记录 |
| Organization | ORGANIZATIONS | 组织 |
| DomainConfig | DOMAIN_CONFIGS | 领域配置 |
| ReadingPlanProgress | READING_PLAN_PROGRESS | 读经打卡 |
| Bookmark | BOOKMARKS | 书签 |
| Note | NOTES | 笔记 |
| KbDocument | KB_DOCUMENTS | 知识库文档 |

---

## 5. API 参考

### 5.1 圣经文本 API

| 方法 | 路径 | 参数 | 说明 |
|------|------|------|------|
| GET | /api/v1/bible/translations | - | 所有译本列表 |
| GET | /api/v1/bible/{translation}/books | - | 书卷列表 |
| GET | /api/v1/bible/{translation}/{book}/{chapter} | - | 章节经文 |
| GET | /api/v1/bible/{translation}/{book}/{chapter}/{verse} | - | 单节经文 |
| GET | /api/v1/bible/{translation}/range | ?start=&end= | 经文范围 |
| GET | /api/v1/bible/{translation}/random | - | 随机经文 |
| GET | /api/v1/bible/interlinear/{translation}/{book}/{chapter} | - | Interlinear 数据 |

### 5.2 SWORD API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/sword/modules | 已安装模块列表 |
| GET | /api/v1/sword/modules/{initials} | 模块详情 |
| GET | /api/v1/sword/modules/{initials}/books | 模块书卷 |
| POST | /api/v1/sword/reload | 重新加载模块 |
| GET | /api/v1/sword/{module}/passage/{reference} | SWORD 经文 |
| GET | /api/v1/sword/{module}/passage/{reference}/strongs | SWORD Strong's |
| GET | /api/v1/sword/{module}/dict/{key} | SWORD 词典条目 |
| GET | /api/v1/sword/{module}/dict/search | SWORD 词典搜索 |

### 5.3 模块安装 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/sword/install/sources | 安装源列表 |
| GET | /api/v1/sword/install/available | 可用模块列表 |
| GET | /api/v1/sword/install/categories | 模块分类 |
| POST | /api/v1/sword/install | 安装模块 |
| DELETE | /api/v1/sword/modules/{initials} | 删除模块 |
| GET | /api/v1/sword/install/status | 安装状态 |

### 5.4 注释 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/annotations/commentaries/{book}/{chapter} | 章节注释 |
| GET | /api/v1/annotations/commentary-sources | 注释源列表 |
| GET | /api/v1/annotations/dictionary-sources | 词典源列表 |
| GET | /api/v1/annotations/dictionaries/{source} | 词典条目 |
| GET | /api/v1/annotations/crossrefs | 交叉引用 |

### 5.5 Strong's 词典 API

| 方法 | 路径 | 参数 | 说明 |
|------|------|------|------|
| GET | /api/v1/strongs/{id} | id=H430 | Strong's 条目 |
| GET | /api/v1/strongs/search | q=love | 搜索 |
| GET | /api/v1/strongs/stats | - | 统计 |

### 5.6 认证 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/auth/captcha | 获取验证码 |
| POST | /api/v1/auth/register | 注册 |
| POST | /api/v1/auth/login | 登录 |
| GET | /api/v1/auth/me | 当前用户 |
| PUT | /api/v1/auth/profile | 修改个人信息 |
| POST | /api/v1/auth/change-password | 修改密码 |

### 5.7 课程 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/courses/{courseId} | 课程详情 |
| POST | /api/v1/courses/{courseId}/enroll | 报名课程 |
| GET | /api/v1/courses/my/enrollments | 我的课程 |
| GET | /api/v1/courses/{courseId}/lessons/{lessonId} | 课时内容 |
| POST | /api/v1/courses/{courseId}/lessons/{lessonId}/complete | 完成课时 |
| GET | /api/v1/courses/{courseId}/progress | 课程进度 |
| GET | /api/v1/courses/{courseId}/exams/{examId} | 考试详情 |
| POST | /api/v1/courses/{courseId}/exams/{examId}/submit | 提交考试 |
| GET | /api/v1/courses/{courseId}/exams/{examId}/results | 考试结果 |
| GET | /api/v1/courses/my/certificates | 我的证书 |
| GET | /api/v1/courses/certificates/verify/{code} | 验证证书 |

### 5.8 读经计划 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/reading-plans/{planCode} | 计划详情 |
| GET | /api/v1/reading-plans/{planCode}/today | 今日 |
| GET | /api/v1/reading-plans/{planCode}/day/{day} | 指定日 |
| GET | /api/v1/reading-plans/{planCode}/full | 完整计划 |
| GET | /api/v1/reading-plans/{planCode}/progress | 进度 |
| POST | /api/v1/reading-plans/{planCode}/progress | 打卡 |
| DELETE | /api/v1/reading-plans/{planCode}/progress | 取消打卡 |

### 5.9 知识库 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/v1/kb/search | 搜索（body: query, model, mode, sourceTypes, topK） |
| GET | /api/v1/kb/stats | 索引统计 |
| GET | /api/v1/kb/document | 获取文档原文（sourceRef 参数） |
| POST | /api/v1/kb/clear-all | 清除所有 KB 数据 |
| POST | /api/v1/kb/index/build-all | 全量索引（zhOnly 参数） |
| POST | /api/v1/kb/index/build/{modelId} | 单模型索引 |

### 5.10 书签/笔记 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/bookmarks/{verseRef} | 查看书签 |
| POST | /api/v1/bookmarks | 添加书签 |
| DELETE | /api/v1/bookmarks/{verseRef} | 删除书签 |
| GET | /api/v1/notes/{verseRef} | 查看笔记 |
| POST | /api/v1/notes | 添加笔记 |
| DELETE | /api/v1/notes/{id} | 删除笔记 |

### 5.11 管理 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/v1/admin/users | 用户列表 |
| POST | /api/v1/admin/users | 创建用户 |
| PUT | /api/v1/admin/users/{id}/role | 修改角色 |
| POST | /api/v1/admin/users/{id}/reset-password | 重置密码 |
| POST | /api/v1/admin/users/{id}/toggle | 启用/禁用 |

---

## 6. 知识库系统

### 6.1 架构

```
                    ┌─────────────────────┐
                    │  KbSearchService     │
                    │  (后端 :8080)        │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │ vectorSearch│  │keywordSearch│  │tryBibleRef  │
    │ (Zvec HTTP) │  │ (Lucene)    │  │ (H2 查询)   │
    └──────┬──────┘  └─────────────┘  └─────────────┘
           │
           ▼ HTTP /zvec/search
    ┌─────────────────────────────┐
    │  Zvec Bridge (前端 :3000)    │
    │  ┌───────────────────────┐  │
    │  │ 内存向量索引           │  │
    │  │ 433K 向量 (5 集合)     │  │
    │  └───────────────────────┘  │
    │  ┌───────────────────────┐  │
    │  │ BIN 持久化             │  │
    │  │ ~108MB (5 文件)        │  │
    │  └───────────────────────┘  │
    │  ┌───────────────────────┐  │
    │  │ BGE 模型 (transformers)│ │
    │  │ bgesmall_512 (24MB)    │ │
    │  │ bgebase_768 (98MB)     │ │
    │  └───────────────────────┘  │
    └─────────────────────────────┘
```

### 6.2 嵌入模型

| 模型 ID | 维度 | 类型 | 位置 | 大小 |
|---------|------|------|------|------|
| tfidf_256 | 256 | TF-IDF Hash | 后端本地（Kotlin） | 0 |
| bgesmall_512 | 512 | BGE-small-zh | 前端（transformers.js） | 24MB |
| bgebase_768 | 768 | BGE-base-zh | 前端（transformers.js） | 98MB |

### 6.3 索引数据

| 集合 | 模型 | 条数 | 来源 |
|------|------|------|------|
| tfidf_256_bible | tfidf_256 | 6,705 | cuv_gb 中文和合本 |
| bgesmall_512_bible | bgesmall_512 | 6,705 | cuv_gb |
| tfidf_256_library | tfidf_256 | 28,478 | 95 本中文书 |
| bgesmall_512_library | bgesmall_512 | 28,478 | 95 本中文书 |
| tfidf_256_dictionary | tfidf_256 | 103,730 | 中文词典 |

### 6.4 搜索模式

| 模式 | 说明 | 权重 |
|------|------|------|
| hybrid | 向量 + 关键词融合 | 向量 0.7 + 关键词 0.3 |
| vector | 纯语义相似度 | 1.0 |
| keyword | 精确关键词匹配 | 1.0 |

### 6.5 Zvec API（前端 :3000）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /zvec/status | 向量数量、已加载模型 |
| GET | /zvec/collections | 所有集合列表 |
| POST | /zvec/search | 向量搜索（body: collection, query, topK） |
| POST | /zvec/embed | 生成嵌入（body: text, modelId） |
| POST | /zvec/load-model | 加载模型 |
| DELETE | /zvec/drop/{collection} | 删除集合 |

---

## 7. 认证与安全

### 7.1 JWT 认证流程

```
1. 用户登录 → POST /api/v1/auth/login
2. 服务端验证用户名密码 + 验证码
3. 生成 JWT（24h 过期）
4. 返回 { token, user }
5. 前端存储 token 到 localStorage
6. 后续请求 Header: Authorization: Bearer {token}
7. 服务端 JwtAuthFilter 验证 token
```

### 7.2 验证码

- GET /api/v1/auth/captcha → { token, question }
- question 为数学题（如 "3 + 7 = ?"）
- 5 分钟有效
- HMAC 签名验证

### 7.3 角色权限

| 角色 | 权限 |
|------|------|
| USER | 读写自己的书签/笔记、读经打卡、课程学习 |
| TEACHER | + 课程管理、阅卷 |
| ADMIN | + 用户管理、模块安装、系统设置 |

### 7.4 安全配置

- 公共 API 全部 `permitAll`（读经、搜索、词典等）
- 管理 API 需 `ADMIN` 角色
- 课程管理需 `TEACHER` 或 `ADMIN` 角色

---

## 8. 国际化（i18n）

### 8.1 双轨制

1. **I18N 对象**（JS 动态文本）：`I18N[lang].key`
2. **data-zh/data-en 属性**（HTML 静态文本）：`applyLanguageLabels()` 遍历
3. **data-zh-title/data-en-title**（tooltip）：`switchLanguage` 中处理

### 8.2 语言模式

```javascript
state.lang = 'zh'        // 仅中文
state.lang = 'en'        // 仅英文
state.lang = 'bilingual' // 双语（默认）
```

### 8.3 双语渲染

- `t(key)` 函数：根据 `state.lang` 返回对应文本
- `applyLanguageLabels()`：遍历所有 `data-zh`/`data-en` 元素
- `cmtName(id)`：注释源名称双语
- `translatePlanLabel(label)`：读经计划标签翻译

---

## 9. 配置参考

### 9.1 application.yml

```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:h2:file:./data/text-db;DB_CLOSE_ON_EXIT=FALSE;MODE=MySQL
    driver-class-name: org.h2.Driver
    username: sa
    password:

  jpa:
    hibernate:
      ddl-auto: update

  cache:
    type: caffeine
    caffeine:
      spec: maximumSize=500,expireAfterAccess=30m

jwt:
  secret: <base64-encoded-secret>
  expiration-ms: 86400000  # 24h

app:
  admin:
    username: admin
    password: admin123

bible:
  text:
    default-translation: web

sword:
  modules-path: data/sword-mods

kb:
  node-service-url: http://localhost:3000
  library-path: frontend/library-data
  sources:
    bible:
      translations: cuv_gb
```

### 9.2 前端 server.js 配置

```javascript
const PORT = 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';
const SWORD_SERVICE_URL = ''; // 空字符串 → 相对路径
```

### 9.3 Zvec 配置

```javascript
// zvec-bridge.js
const ZVEC_DATA_DIR = './data';  // BIN 文件目录
const MODEL_DIR = './models';     // BGE 模型目录
```

---

## 10. 编译与部署

### 10.1 编译后端

```bash
cd bible-monolith
./gradlew bootJar -x test
# 产物：build/libs/bible-monolith.jar (75MB)
```

### 10.2 JVM 启动参数

```bash
java -Dfile.encoding=UTF-8 \
  -Xms48m -Xmx2g \
  -jar bible-monolith.jar \
  --sword.modules-path=data/sword-mods
```

> 索引构建时用 `-Xmx2g`，正常运行用 `-Xmx256m`

### 10.3 前端启动

```bash
cd frontend
node server.js
```

### 10.4 nginx 配置

```nginx
server {
    listen 80;
    location /bible/ {
        alias /opt/bible-microservices/frontend/;
        index index.html;
    }
    location /api/ {
        proxy_pass http://localhost:8080;
    }
}
```

---

## 11. 编码规范

### 11.1 Kotlin

- 使用 `data class` 定义 DTO 和 Entity
- Service 类用 `@Service` 注解
- Controller 用 `@RestController` + `@RequestMapping`
- Repository 继承 `JpaRepository`
- 缓存用 `@Cacheable` / `@CacheEvict`

### 11.2 JavaScript

- 无框架依赖，原生 JS
- `var` 声明全局状态（`state` 对象）
- IIFE 隔离作用域
- `fetch()` 调用 API
- `innerHTML` 动态渲染
- 版本号格式：`v=YYYYMMDDx`

### 11.3 编码注意事项

- Windows PowerShell 写中文文件用 Node.js `fs.writeFileSync` 而非 `Set-Content`（避免 BOM）
- 前端文件编辑后必须更新版本号
- H2 相对路径从 CWD 解析，启动时固定 CWD
- `write` 工具覆盖写入，大文件编辑前先备份

### 11.4 文件编码

- 所有源码 UTF-8 无 BOM
- PowerShell 写 .kt/.java 用 CRLF + 无 BOM
- HTML emoji 用实体编码（如 `&#128214;`）

---

*本文档最后更新：2026-07-23*
