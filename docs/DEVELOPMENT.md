# 开发指南

**Last updated**: 2026-06-27 | **Branch**: `monolith-clean`

---

## 环境要求

| 工具 | 版本 | 获取方式 |
|------|------|---------|
| JDK | 17+ | `scoop install openjdk17` |
| Node.js | 22+ | 通常已安装 |
| Gradle | 8.x (wrapper) | 项目自带 `gradlew.bat` |
| Git | 任意 | `winget install Git.Git` |

---

## 快速启动（单体模式）

### 1. 编译单体 JAR

```powershell
cd D:\dev\github\bible-microservices
$env:JAVA_HOME = "C:\Users\PC\scoop\apps\openjdk17\current"
.\gradlew.bat :bible-monolith:bootJar
# 输出: bible-monolith/build/libs/bible-monolith.jar (~75MB)
```

### 2. 启动后端（⚠️ 必须从项目根目录启动）

```powershell
cd D:\dev\github\bible-microservices
java -Xms48m -Xmx256m -XX:+UseG1GC `
  -Dsword.modules-path=./data/sword-mods `
  -jar bible-monolith/build/libs/bible-monolith.jar
```

> **⚠️ 关键**: 必须从项目根目录启动，否则 H2 相对路径 `./data/text-db` 会解析到错误位置，
> 创建空数据库（49KB）而非使用真实数据库（231MB）。

### 3. 启动前端

```powershell
cd D:\dev\github\bible-microservices\frontend
node server.js
```

### 4. 验证

```powershell
# 后端 API
curl http://localhost:8080/api/v1/bible/translations
curl http://localhost:8080/api/v1/sword/modules
curl http://localhost:8080/api/v1/reading-plans

# 前端
# 桌面版: http://localhost:3000/
# 手机版: http://localhost:3000/m/
```

---

## 开发工作流

### 修改后端代码

```powershell
# 1. 编译
$env:JAVA_HOME = "C:\Users\PC\scoop\apps\openjdk17\current"
.\gradlew.bat :bible-monolith:bootJar

# 2. 停止旧进程
taskkill /F /FI "WINDOWTITLE eq *java*"
# 或用 PID
netstat -ano | findstr ":8080"
taskkill /F /PID <PID>

# 3. 重新启动
java -Xms48m -Xmx256m -jar bible-monolith/build/libs/bible-monolith.jar
```

### 修改前端代码

```powershell
# 修改 app.js / mobile.js / index.html 后：
# 1. 语法检查
node -c frontend/js/app.js
node -c frontend/m/mobile.js

# 2. 更新版本号（index.html 和 m/index.html 中的 ?v=xxx）
# 3. 硬刷新浏览器 (Ctrl+F5)
```

### 编码规范

- **Kotlin**: 标准 Spring Boot 风格，DTO 分离，Service 层 + Controller 层
- **JavaScript**: ES5+（无 Babel），全局 state 对象模式
- **CSS**: 原生 CSS，使用 CSS Variables 和 Flexbox/Grid
- **Git**: commit 前确保 `node -c` 语法检查通过

---

## 项目结构（单体模式）

```
bible-microservices/
├── bible-monolith/             # ★ 单体应用 — 单 JVM，所有服务
│   └── src/main/kotlin/com/bible/monolith/
│       ├── controller/         # REST 控制器
│       │   ├── BibleController.kt       # 圣经正文 + Strong's
│       │   ├── SearchController.kt      # 全文搜索
│       │   ├── AnnotationController.kt  # 注释 + 书签 + 笔记
│       │   ├── PassageController.kt     # SWORD 经文 + Interlinear
│       │   ├── DictionaryController.kt  # SWORD 词典
│       │   ├── GenBookController.kt     # 灵修/通用书
│       │   ├── ModuleController.kt      # SWORD 模块管理
│       │   ├── ModuleInstallController.kt
│       │   ├── ReadingPlanController.kt # 读经计划
│       │   └── AuthController.kt        # 用户认证
│       ├── service/            # 业务逻辑
│       ├── model/              # JPA 实体
│       ├── repository/         # Spring Data JPA
│       ├── dto/                # 数据传输对象
│       └── resources/
│           ├── application.yml  # Spring Boot 配置
│           └── reading-plans/   # JSON 读经计划
│               ├── mcheyne.json  # M'Cheyne 365天
│               ├── nt90.json     # 新约90天
│               └── proverbs30.json # 箴言30天
├── bible-gateway/              # 原微服务（保留参考，不再使用）
├── bible-text-service/         # 原微服务（保留参考，不再使用）
├── bible-search-service/       # 原微服务（保留参考，不再使用）
├── bible-module-service/       # 原微服务（保留参考，不再使用）
├── bible-auth-service/         # 原微服务（保留参考，不再使用）
├── bible-sword-service/        # 原微服务（保留参考，不再使用）
├── bible-sword-reader/         # JSword 库 + stubs（共享依赖）
├── frontend/                   # 前端 (:3000)
│   ├── index.html              # 桌面版入口
│   ├── server.js               # Node.js 静态服务 + API 代理
│   ├── css/style.css           # 桌面版样式 (1561 行)
│   ├── js/
│   │   ├── app.js              # 桌面版逻辑 (3704 行)
│   │   ├── morphology.js       # 形态码解析 (406+ codes)
│   │   ├── api.js              # API 封装
│   │   └── config.js           # 配置 (basePath 自动检测)
│   ├── m/                      # ★ 手机版 PWA
│   │   ├── index.html
│   │   ├── mobile.js           # 手机版逻辑
│   │   ├── mobile.css
│   │   ├── manifest.json
│   │   └── icon.svg
│   ├── modules.html            # 模块管理页
│   └── admin.html              # 管理面板
├── data/                       # 运行时数据 (gitignored)
│   ├── text-db.mv.db           # H2 数据库 (~231MB)
│   ├── auth-db.mv.db           # 认证数据库
│   ├── bible-module.mv.db      # 模块元数据
│   ├── sword-mods/             # 25+ SWORD 模块
│   ├── sword-dicts/            # Strong's JSON 词典
│   └── search-index/           # Lucene 索引
├── scripts/                    # 数据导入脚本
├── docs/                       # 文档
├── build.gradle.kts            # 根 Gradle 配置
└── README.md
```

---

## 常见问题

### 1. 端口被占用
```powershell
netstat -ano | findstr ":8080"
taskkill /F /PID <PID>
```

### 2. H2 数据库为空（只有 49KB）
- **原因**: JAR 从 `build/libs/` 目录启动，H2 相对路径解析错误
- **解决**: `cd` 到项目根目录再启动

### 3. Gradle 内存不足 (SIGKILL)
```powershell
$env:GRADLE_OPTS = "-Xmx512m"
.\gradlew.bat :bible-monolith:bootJar
```

### 4. H2 数据库锁定
- 确保只有一个 monolith 进程在运行
- `pkill -f bible-monolith.jar`（Linux）或 `taskkill /F /IM java.exe`（Windows）

### 5. 前端缓存不更新
- `Ctrl+Shift+R` 硬刷新
- 或更新 `index.html` 中的 `?v=xxx` 版本号

### 6. CORS 错误
- 确认 `server.js` 代理在运行
- 确认所有 API 请求使用相对路径 `/api/...`

### 7. SWORD 模块不加载
```powershell
curl -X POST http://localhost:8080/api/v1/sword/reload
curl http://localhost:8080/api/v1/sword/modules
```

### 8. Linux 上地图模块返回 0 张
- **原因**: JSword 模块名大小写匹配在 Linux 上失败
- **解决**: 创建符号链接
```bash
cd data/sword-mods
ln -s BibleAtlas bibleatlas
ln -s BibleMap biblemap
```

---

## 测试

```powershell
# 后端测试
.\gradlew.bat test

# 前端语法检查
node -c frontend/js/app.js
node -c frontend/js/api.js
node -c frontend/js/config.js
node -c frontend/m/mobile.js
```

---

## 服务器部署

参见 [DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md)
