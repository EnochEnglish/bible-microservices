# 一键启动脚本 — Bible Microservices

**时间**: 2026-06-06 04:30-04:50

**目标**: 创建 `start-all.ps1` + `stop-all.ps1`，一键启动/停止全部 6 个服务。

**服务清单**:
| 服务 | 端口 | JAR | WorkingDirectory | 启动耗时 |
|------|------|-----|-----------------|---------|
| Text | 8081 | bible-text-service/build/libs/ | bible-text-service/ | ~80s |
| Search | 8082 | bible-search-service/build/libs/ | bible-search-service/ | ~30s |
| Module | 8083 | bible-module-service/build/libs/ | bible-module-service/ | ~15s |
| Gateway | 8080 | bible-gateway/build/libs/ | bible-gateway/ | ~10s |
| Sword | 8086 | bible-sword-service/build/libs/ | bible-microservices/ (root) | ~10s |
| Frontend | 3000 | python -m http.server | frontend/ | ~3s |

**关键决策**:
- JAR 来源: `build/libs/` (Gradle 构建输出)，非 dist/ (已过时)
- JAVA_HOME: scoop openjdk17，回退到 dist/ 内置 JRE
- 启动方式: `Start-Process -WindowStyle Hidden` (避免 PS SIGKILL)
- 健康检查: /actuator/health → root `/` → netstat 端口扫描 三重回退
- 不重定向 stdout/stderr（避免同文件冲突）

**遇到的问题与修复**:
1. `$PSScriptRoot` 空值 → 硬编码 ROOT 路径
2. `RedirectStandardOutput` 与 `RedirectStandardError` 同文件 → 移除重定向
3. root `/` 返回 404 被误判为未启动 → 改用端口监听检测
4. Text 服务 ~80s 启动时间（231MB H2 DB）→ 等待时间设为 25s + 最终验证用端口检测

**当前状态**: 全部 6 个服务运行正常，API 全链路验证通过。
- Gateway (:8080) — KJV Gen 1:1, Search, Annotations, Dictionary, Strong's 全部 200
- Sword (:8086) — 18 模块发现，KJV/ChiUns passage 正常，字典端点待补充
- Frontend (:3000) — index.html 可访问
