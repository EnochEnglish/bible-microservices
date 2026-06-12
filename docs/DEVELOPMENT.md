# 开发指南

## 环境要求

| 工具 | 版本 | 获取方式 |
|------|------|---------|
| JDK | 17 | `scoop install openjdk17` |
| Node.js | 18+ | 通常已安装 |
| Gradle | 8.x (wrapper) | 项目自带 `gradlew.bat` |
| Git | 任意 | `winget install Git.Git` |

## 快速启动

### 1. 编译所有微服务
```powershell
cd D:\dev\github\bible-microservices
.\gradlew.bat build -x test
```

### 2. 启动服务（按顺序）

```powershell
# 设置 JAVA_HOME (如果默认不是 JDK 17)
$env:JAVA_HOME = "C:\Users\PC\scoop\apps\openjdk17\current"

# 逐个启动（推荐用后台进程）
# 1. Text Service (:8081) — 15-25 秒启动
Start-Process -WindowStyle Hidden -FilePath "java" -ArgumentList "-jar", "bible-text-service/build/libs/bible-text-service.jar"

# 2. Search Service (:8082)
Start-Process -WindowStyle Hidden -FilePath "java" -ArgumentList "-jar", "bible-search-service/build/libs/bible-search-service.jar"

# 3. Module Service (:8083)
Start-Process -WindowStyle Hidden -FilePath "java" -ArgumentList "-jar", "bible-module-service/build/libs/bible-module-service.jar"

# 4. Sword Service (:8086) — 需要模块路径参数
Start-Process -WindowStyle Hidden -FilePath "java" -ArgumentList "-jar", "dist/bible-sword-service.jar", "--sword.modules-path=D:/dev/github/bible-microservices/data/sword-mods"

# 5. Gateway (:8080) — 最后启动
Start-Process -WindowStyle Hidden -FilePath "java" -ArgumentList "-jar", "bible-gateway/build/libs/bible-gateway.jar"

# 6. Frontend (:3000)
Start-Process -WindowStyle Hidden -FilePath "npx" -ArgumentList "serve", "frontend", "-p", "3000", "--no-clipboard"
```

### 3. 验证服务

```powershell
# Gateway
curl http://localhost:8080/actuator/health

# API 测试
curl http://localhost:8080/api/v1/bible/kjv/gen/1
curl http://localhost:8080/api/v1/sword/modules
curl http://localhost:8080/api/v1/strongs/H7225
```

### 4. 打开前端

浏览器访问: `http://localhost:3000`

---

## 开发工作流

### 修改后端代码

```powershell
# 编译单个服务
.\gradlew.bat bible-text-service:build -x test

# 停止旧进程
taskkill /F /IM java.exe /FI "WINDOWTITLE eq bible-text-service*"

# 启动新版本
Start-Process -WindowStyle Hidden -FilePath "java" -ArgumentList "-jar", "bible-text-service/build/libs/bible-text-service.jar"
```

### 修改前端代码

```powershell
# 修改 app.js / index.html / style.css
# 然后:
# 1. node -c frontend/js/app.js  (语法检查)
# 2. 重启前端 serve 或硬刷新浏览器 (Ctrl+F5)
```

### JAR 构建到 dist/

```powershell
# 构建需要的服务到 dist/ 目录
.\gradlew.bat bible-sword-service:bootJar
copy bible-sword-service\build\libs\bible-sword-service.jar dist\
```

---

## 常见问题

### 1. 端口被占用
```powershell
netstat -ano | findstr "8080"
taskkill /F /PID <PID>
```

### 2. JAVA_HOME 不对
```powershell
# 确认 JDK 版本
java -version
# 如果不是 17，设置:
$env:JAVA_HOME = "C:\Users\PC\scoop\apps\openjdk17\current"
```

### 3. Gradle 内存不足 (SIGKILL)
```powershell
# 限制 Gradle daemon 内存
$env:GRADLE_OPTS = "-Xmx512m"
.\gradlew.bat build -x test
```

### 4. H2 数据库锁定
```powershell
# 确保只有 text-service 在写 H2
# 如需要导入数据，先停止 text-service
taskkill /F /FI "WINDOWTITLE eq *text-service*"
```

### 5. SWORD 模块不加载
```powershell
# 确认路径正确
curl -X POST http://localhost:8086/api/v1/sword/reload
curl http://localhost:8086/api/v1/sword/modules
```

### 6. 前端缓存不更新
```
Ctrl+Shift+R (硬刷新) 或 清空浏览器缓存
```

### 7. CORS 错误
```
检查 server.js 代理是否在运行
确认所有 API 请求使用相对路径 (/api/...)
```

---

## 项目结构

```
bible-microservices/
├── bible-gateway/               # API 网关
│   └── src/main/kotlin/.../
│       └── GatewayApplication.kt
├── bible-text-service/          # 圣经正文/Strong's/注释/笔记/书签
│   └── src/main/kotlin/.../
│       ├── controller/
│       │   ├── BibleController.kt
│       │   ├── StrongsController.kt
│       │   ├── AnnotationController.kt
│       │   └── CrossRefService.kt
│       └── service/
├── bible-search-service/        # 全文搜索
│   └── src/main/kotlin/.../
│       └── controller/
│           └── SearchController.kt
├── bible-module-service/        # 模块元数据
│   └── src/main/kotlin/.../
│       └── controller/
│           └── ModuleController.kt
├── bible-sword-service/         # SWORD 格式解析 (JSword)
│   └── src/main/kotlin/.../
│       ├── controller/
│       │   ├── PassageController.kt
│       │   ├── DictionaryController.kt
│       │   ├── GenBookController.kt
│       │   ├── ModuleController.kt
│       │   └── ModuleInstallController.kt
│       └── service/
│           ├── ModuleInstallService.kt
│           └── SwordRegistry.kt
├── bible-sword-reader/          # JSword 基础设施
│   └── src/main/kotlin/.../
│       └── LuceneIndexManager.kt (stub)
├── frontend/                    # 前端 SPA
│   ├── index.html
│   ├── server.js
│   ├── style.css
│   └── js/
│       ├── app.js
│       ├── api.js
│       └── config.js
├── dist/                        # 构建产物
├── data/                        # 运行时数据 (gitignored)
│   ├── text-db.mv.db
│   ├── sword-mods/
│   └── search-index/
├── scripts/                     # 数据导入脚本
├── tests/                       # 测试
├── docs/                        # 文档
│   ├── ARCHITECTURE.md
│   ├── SWORD-FORMAT-GUIDE.md
│   ├── FRONTEND-ARCHITECTURE.md
│   ├── API-REFERENCE.md
│   ├── SELF-HOSTED-REPO.md
│   ├── MODULE-INSTALL-SYSTEM.md
│   └── DEVELOPMENT.md
├── build.gradle.kts
├── settings.gradle.kts
├── .gitignore
└── README.md
```

---

## 编码规范

- **Kotlin**: 标准 Spring Boot 风格
- **JavaScript**: ES5+ (无 Babel), 全局 state 对象模式
- **CSS**: 原生 CSS, 使用 CSS Variables 和 Flexbox/Grid
- **Git**: commit 前确保 `node -c app.js` 通过

## 测试

```powershell
# 运行所有测试
.\gradlew.bat test

# 前端语法检查
node -c frontend/js/app.js
node -c frontend/js/api.js
node -c frontend/js/config.js

# E2E 测试
node tests/e2e.test.cjs
```
