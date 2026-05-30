# bible-microservices 备份

**备份时间**: 2026-05-29 10:10 CST
**备份大小**: 573.5 MB (源码+数据+部署包)
**源路径**: C:\Users\PC\.qclaw\workspace-v733kxt9elzfv7u1\bible-microservices

## 项目概述

基于 Spring Boot 3.2 + Kotlin 的圣经微服务系统，4 服务架构：
- **Gateway** (:8080) — API 网关/路由/CORS
- **Text** (:8081) — 经文查询/译本管理/Strong's 词典
- **Search** (:8082) — Lucene 全文检索
- **Module** (:8083) — 模块导入/格式解析

## 当前数据

| 类别 | 数量 |
|------|------|
| 译本 | 13 个 (英文7 + 中文2 + 希腊2 + 拉丁1 + 希伯来1) |
| 经文 | 23.2万+ 节 |
| Strong's 词典 | 14,341 条 (希腊5,667 + 希伯来8,674) |
| TSK 交叉引用 | 29,059 条 (52/66 书卷) |
| 注释 | JFB 602 + MHCC 524 |
| 搜索索引 | 13 个 Lucene 索引 |
| 前端 | 三栏暗色主题，多版本对照，中英双语 |
| 回归测试 | 74 项全通过 |

## 部署要求

- **运行环境**: Java 17+ (推荐 OpenJDK 17)
- **系统**: Windows / Linux (cloud-deploy 包支持 Linux)
- **端口**: 8080-8083, 3000
- **数据库**: H2 文件数据库 (data/text-db.mv.db, 121 MB)

## 目录结构

```
bible-microservices/
├── bible-gateway/         # API 网关源码
├── bible-text-service/    # 经文服务源码
├── bible-search-service/  # 搜索服务源码
├── bible-module-service/  # 模块服务源码
├── frontend/              # 前端 SPA
├── data/                  # 数据库 + 搜索索引 + SWORD 模块
├── scripts/               # 导入脚本 + 工具
├── cloud-deploy/          # Linux 云部署包 (含 4 个 JAR)
├── tests/                 # 回归测试套件
└── artifacts/             # 任务文档
```

## 快速启动

```bash
# 方式 1: Gradle 启动 (Windows)
gradlew.bat :bible-text-service:bootRun
gradlew.bat :bible-search-service:bootRun
gradlew.bat :bible-gateway:bootRun

# 方式 2: JAR 启动 (Linux)
cd cloud-deploy && ./start.sh

# 方式 3: 前端
cd frontend && python -m http.server 3000
```

启动顺序: Text → Search → Module → Gateway，每个等待 15-30 秒。

## 同步

- GitHub: 待推送
- 云服务器: cloud-deploy/ 目录上传即可
