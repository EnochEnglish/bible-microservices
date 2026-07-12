# Bible Microservices — 在线圣经学习系统

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-green)]()
[![Kotlin](https://img.shields.io/badge/Kotlin-1.9-purple)]()

一个基于 Spring Boot + Kotlin 的单体圣经学习微服务系统，支持多译本对照、Strong's 词典、注释、逐词对照（Interlinear）、地图、灵修、读经计划、在线课程和答题系统。

## ✨ 核心功能

### 圣经阅读
- **多译本对照**：22+ 译本（中文、英文、希腊文、希伯来文），支持并排对照阅读
- **逐词对照（Interlinear）**：KJV/ChiUns/BSB/OSHB 等 7 个译本支持 Strong's 编号
- **Strong's 词典**：希伯来语 8674 条 + 希腊语 5667 条，悬停即查
- **形态学标注**：406+ 形态码覆盖，hover 显示语法解释
- **全文搜索**：基于 Lucene 索引，支持 8 个英文译本
- **经文注释**：34 个注释源（H2 表 9 源 + SWORD 直读 25 源）

### 学习工具
- **灵修**：每日灵修（SME/Daily），OSIS XML 解析，分段渲染
- **地图**：3 个地图集（ABSMaps 8 张、BibleAtlas 8 张、BibleMap 2 张），支持缩放/全屏/拖拽
- **读经计划**：3 个预设计划（M'Cheyne 365 天、新约 90 天、箴言 30 天），打卡进度跟踪
- **书签 & 笔记**：登录用户可保存书签和个人笔记

### 在线课程系统
- **三门门徒训练课程**：新生命（12 课）、新生活（12 课）、一对一门徒训练（15 课），共 39 课 173,013 字
- **课程内容**：从 blessed.org 原始 HTML 导入，含 48 张插图
- **Markdown 渲染**：课程内容支持 Markdown 格式（标题、加粗、列表、引用、图片、代码）
- **答题系统**：
  - 自动从课程内容提取填空题（`____` 下划线、`（  ）` 中文括号）
  - 自动提取选择题（`是（）不是（）` 模式）
  - 学生在线答题，自动评分（选择/填空）
  - 主观题（简答/论述）教师手动阅卷
  - 百分制，及格线 60 分，支持多次尝试
  - 证书自动颁发
- **图书馆**：64 本中文属灵书籍，从 blessed.org DOC 文件批量导入

### 用户系统
- **JWT 认证**：无状态 JWT（42 小时过期），数学验证码（5 分钟有效期）
- **角色权限**：USER / TEACHER / ADMIN
- **组织管理**：多领域支持（神学/英语/大学/计算机/社区图书馆）

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────┐
│                浏览器 (前端)                  │
│  桌面版 (index.html + app.js)                │
│  手机版 (m/index.html + mobile.js)           │
│  课程页 (courses.html + courses.js)          │
│  图书馆 (library.html + library.js)          │
│  答题模块 (quiz.js + quiz-extract.js)        │
│  阅卷模块 (grading.js)                       │
└──────────────┬──────────────────────────────┘
               │ HTTP API (/api/v1/*)
┌──────────────┴──────────────────────────────┐
│         Bible Monolith (端口 8080)           │
│  Spring Boot 3.x + Kotlin 单体应用           │
│                                              │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐      │
│  │  Bible  │ │  Sword  │ │  Course  │      │
│  │ Service │ │ Service │ │ Service  │      │
│  └─────────┘ └─────────┘ └──────────┘      │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐      │
│  │  Auth   │ │ Search  │ │  Module  │      │
│  │ Service │ │ Service │ │ Install  │      │
│  └─────────┘ └─────────┘ └──────────┘      │
│                                              │
│  ┌─────────────────────────────────┐        │
│  │          H2 数据库 (231MB)       │        │
│  │  译本/经文/词典/注释/用户/课程   │        │
│  └─────────────────────────────────┘        │
│  ┌─────────────────────────────────┐        │
│  │     JSword SWORD 模块 (123个)    │        │
│  │  16圣经 / 5词典 / 1注释 / 3通用书 │        │
│  └─────────────────────────────────┘        │
└─────────────────────────────────────────────┘
```

### 技术栈
- **后端**：Spring Boot 3.x + Kotlin + H2 Database + JSword
- **前端**：原生 HTML/CSS/JS（无框架依赖）+ Node.js 静态服务
- **部署**：单体 JAR (75MB) + nginx 反向代理
- **JVM**：JDK 17，-Xms48m -Xmx256m

## 📂 项目结构

```
bible-microservices/
├── bible-monolith/           # 后端单体应用
│   ├── src/main/kotlin/com/bible/monolith/
│   │   ├── controller/       # REST API 控制器
│   │   ├── service/          # 业务逻辑
│   │   ├── model/            # JPA 实体
│   │   ├── repository/       # Spring Data JPA
│   │   ├── dto/              # 数据传输对象
│   │   ├── security/         # JWT 认证
│   │   └── config/           # 配置类
│   ├── build/libs/           # 编译产物 JAR
│   └── data/                 # H2 数据库 + SWORD 模块
├── frontend/                 # 前端静态文件
│   ├── index.html            # 桌面版主页
│   ├── m/                    # 手机版
│   ├── js/                   # JavaScript 模块
│   │   ├── app.js            # 桌面版主逻辑
│   │   ├── courses.js        # 课程页面逻辑
│   │   ├── quiz.js           # 答题模块
│   │   ├── quiz-extract.js   # 题目提取工具
│   │   ├── grading.js        # 教师阅卷模块
│   │   ├── library.js        # 图书馆逻辑
│   │   └── morphology.js     # 形态学数据
│   ├── css/                  # 样式表
│   ├── library-data/         # 图书馆数据 + 课程图片
│   └── server.js             # Node.js 静态服务 + API 代理
├── data/sword-mods/          # SWORD 模块存储
├── docs/                     # 文档
└── README.md
```

## 🚀 快速开始

### 环境要求
- JDK 17+
- Node.js 16+
- Git

### 本地运行

```bash
# 1. 克隆仓库
git clone https://github.com/EnochEnglish/bible-microservices.git
cd bible-microservices

# 2. 编译后端
cd bible-monolith
./gradlew bootJar -x test

# 3. 启动后端
java -Dfile.encoding=UTF-8 -Xms48m -Xmx256m \
  -jar build/libs/bible-monolith.jar \
  --sword.modules-path=../data/sword-mods

# 4. 启动前端
cd ../frontend
node server.js

# 5. 访问
# 桌面版: http://localhost:3000/
# 手机版: http://localhost:3000/m/
# 课程:   http://localhost:3000/courses.html
# 图书馆: http://localhost:3000/library.html
```

### 服务器部署

详见 [部署说明文档](docs/DEPLOYMENT.md)

## 📖 文档

- [技术文档](docs/TECHNICAL.md) — 系统架构、API 参考、数据模型
- [需求文档](docs/REQUIREMENTS.md) — 功能需求、用户故事、验收标准
- [部署说明](docs/DEPLOYMENT.md) — 服务器配置、nginx、SSL、监控
- [开发指南](docs/DEVELOPMENT.md) — 开发环境、编码规范、测试

## 📜 许可证

MIT License
