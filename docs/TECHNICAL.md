# 技术文档 — Bible Microservices

## 1. 系统架构

### 1.1 单体应用设计

系统采用单体架构（从早期 7 微服务合并而来），所有功能模块运行在单个 JVM 进程中：

| 模块 | 端口 | 功能 |
|------|------|------|
| Bible Monolith | 8080 | 所有 API 端点 |
| Frontend | 3000 | Node.js 静态文件服务 + API 代理 |
| nginx | 80/443 | 反向代理 + 静态文件 |

**为什么单体**：从 7 个 Spring Boot 微服务合并为单体，节省 71% 内存（~350MB → ~120MB），适合 1GB 内存的服务器。

### 1.2 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 语言 | Kotlin | 1.9 |
| 框架 | Spring Boot | 3.x |
| 数据库 | H2 | 2.2.224 |
| ORM | Spring Data JPA | 3.x |
| 安全 | Spring Security + JWT | - |
| 圣经引擎 | JSword | - |
| 前端 | 原生 HTML/CSS/JS | - |
| 前端服务 | Node.js | 16+ |
| JDK | OpenJDK | 17 |
| 构建 | Gradle | 8.x |

## 2. API 参考

### 2.1 圣经阅读

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/api/v1/bible/translations` | 译本列表 | 否 |
| GET | `/api/v1/bible/{translation}/{book}/{chapter}` | 章节经文 | 否 |
| GET | `/api/v1/bible/search?q={query}` | 全文搜索 | 否 |
| GET | `/api/v1/strongs/{id}` | Strong's 词典查询 | 否 |
| GET | `/api/v1/sword/modules` | SWORD 模块列表 | 否 |
| GET | `/api/v1/sword/passage/{module}/{ref}` | SWORD 经文 | 否 |

### 2.2 注释 & 词典

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/annotations/{bookId}/{chapter}` | 注释（34源） |
| GET | `/api/v1/dictionaries/search?q={query}` | 词典搜索 |
| GET | `/api/v1/sword/dictionaries/{module}/{key}` | SWORD 词典 |

### 2.3 灵修 & 通用书

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/sword/genbook/{module}/keys` | 通用书键列表 |
| GET | `/api/v1/sword/genbook/{module}/content?key={key}` | 通用书内容 |

### 2.4 读经计划

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/api/v1/reading-plans` | 计划列表 | 否 |
| GET | `/api/v1/reading-plans/{code}/today` | 今日阅读 | 否 |
| POST | `/api/v1/reading-plans/{code}/check` | 打卡 | 是 |

### 2.5 课程系统

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| GET | `/api/v1/courses` | 课程列表 | 否 |
| GET | `/api/v1/courses/{id}` | 课程详情 | 否 |
| POST | `/api/v1/courses/{id}/enroll` | 报名 | 是 |
| POST | `/api/v1/courses/{id}/lessons/{lid}/complete` | 完成课程 | 是 |
| GET | `/api/v1/courses/{id}/lessons/{lid}/questions` | 提取题目 | 否 |
| POST | `/api/v1/courses/{id}/lessons/{lid}/exam-from-content` | 从内容创建考试 | 是 |
| GET | `/api/v1/courses/{id}/exams/{eid}` | 获取考试 | 否 |
| POST | `/api/v1/courses/{id}/exams/{eid}/submit` | 提交答案 | 是 |
| GET | `/api/v1/courses/{id}/exams/{eid}/results` | 我的成绩 | 是 |
| GET | `/api/v1/courses/exams/{eid}/results/all` | 全班成绩 | 教师 |
| GET | `/api/v1/courses/gradings/pending` | 待阅卷 | 教师 |
| POST | `/api/v1/courses/gradings/{gid}/grade` | 提交评分 | 教师 |
| GET | `/api/v1/courses/my/certificates` | 我的证书 | 是 |

### 2.6 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/auth/register` | 注册（需验证码） |
| POST | `/api/v1/auth/login` | 登录 |
| GET | `/api/v1/auth/captcha` | 获取验证码 |
| GET | `/api/v1/auth/me` | 当前用户信息 |

## 3. 数据模型

### 3.1 核心实体关系

```
User ──┬── CourseEnrollment ──── Course
       │                           ├── Section ── Lesson
       │                           └── Exam ──┬── ExamResult ── ExamGrading
       │                                       └── Certificate
       ├── LessonProgress
       ├── Bookmark
       └── Note

Translation ── Book ── Verse
                  └── Commentary
                  └── DictionaryEntry
                  └── Word (Strong's)
```

### 3.2 H2 数据库表

| 表名 | 记录数 | 说明 |
|------|--------|------|
| TRANSLATIONS | 22 | 译本元数据 |
| BOOKS | 1,188 | 书卷元数据（66卷 × 18译本） |
| VERSES | 31102+ | 经文文本 |
| WORDS | 18,629 | Strong's 词典 |
| COMMENTARIES | 34源 | 注释内容 |
| USERS | - | 用户 |
| COURSES | 3 | 课程 |
| COURSE_LESSONS | 39 | 课程章节 |
| COURSE_EXAMS | - | 考试 |
| COURSE_EXAM_RESULTS | - | 考试成绩 |
| COURSE_EXAM_GRADINGS | - | 阅卷记录 |
| COURSE_CERTIFICATES | - | 证书 |

### 3.3 SWORD 模块

123 个模块由 JSword 管理，存储在 `data/sword-mods/`：
- 16 圣经译本
- 5 词典
- 1 注释
- 3 通用书
- 98 其他（地图、灵修等）

## 4. 前端架构

### 4.1 模块划分

```
frontend/
├── js/
│   ├── app.js           # 桌面版主逻辑（书卷导航/经文渲染/对照/Interlinear）
│   ├── courses.js       # 课程页面（列表/详情/阅读/考试）
│   ├── quiz.js          # 答题模块（MutationObserver 自动增强）
│   ├── quiz-extract.js  # 题目提取工具（正则解析填空/选择模式）
│   ├── grading.js       # 教师阅卷模块
│   ├── library.js       # 图书馆
│   ├── morphology.js    # 形态学数据（406+ 形态码）
│   └── config.js        # 路径前缀配置
├── css/
│   ├── style.css        # 桌面版主样式
│   ├── courses.css      # 课程页样式
│   ├── quiz.css         # 答题样式
│   └── grading.css      # 阅卷样式
├── m/                   # 手机版
│   ├── mobile.js        # 手机版主逻辑
│   └── mobile.css       # 手机版样式
└── server.js            # Node.js 静态服务 + API 代理
```

### 4.2 国际化

- **双轨制**：I18N 对象（JS 动态文本）+ `data-zh`/`data-en` 属性（HTML 静态文本）
- **三种模式**：中文 / English / 🌐 双语
- **切换**：`switchLanguage()` + `applyLanguageLabels()` + `updateLabels()`

### 4.3 答题系统工作流

```
课程内容渲染 (renderMarkdown)
        ↓
MutationObserver 检测 DOM 变化
        ↓
quiz.js: enhanceLessonContent()
        ↓
quiz-extract.js: enhanceHtml()
  ├── ____ → <input class="quiz-blank-input">
  ├── 是（）不是（） → <input type="radio">
  └── （  ） → <input class="quiz-blank-input">
        ↓
用户填写答案 → QuizModule.submit()
        ↓
POST /api/v1/courses/{id}/exams/{eid}/submit
        ↓
后端自动评分 (选择题/填空题)
  └── 主观题 → 创建 Grading 记录 → 教师阅卷
        ↓
返回成绩 (score + passed)
```

## 5. 编码规范

### 5.1 Kotlin
- JPA 实体使用 `data class`
- DTO 与 Entity 分离
- Controller 只做路由，Service 处理业务逻辑
- `@Cacheable` 缓存昂贵操作

### 5.2 JavaScript
- 纯原生 JS，无框架依赖
- IIFE 模块封装（`(function(){ ... })()`）
- 通过 `window.ModuleName` 暴露公共 API
- CSS 变量适配深色主题

### 5.3 编码安全
- **禁止** PowerShell `Set-Content` 写中文文件（编码损坏）
- **必须** 使用 Node.js `fs.writeFileSync(path, content, 'utf8')` 写文件
- 从 git 恢复文件用 `execSync('git show HEAD:path', { encoding: 'buffer' })`

## 6. 编译与测试

```bash
# 编译后端
cd bible-monolith
./gradlew bootJar -x test

# 编译产物
build/libs/bible-monolith.jar (~75MB)

# 启动
java -Dfile.encoding=UTF-8 -Xms48m -Xmx256m \
  -jar build/libs/bible-monolith.jar \
  --sword.modules-path=../data/sword-mods

# 前端语法检查
node -c frontend/js/quiz.js
node -c frontend/js/quiz-extract.js
node -c frontend/js/grading.js
```
