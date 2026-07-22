# Bible Microservices — 运维人员手册

> 版本：v1.0 | 更新日期：2026-07-23 | 适用版本：v=20260722c

---

## 目录

1. [系统概述](#1-系统概述)
2. [环境要求](#2-环境要求)
3. [部署架构](#3-部署架构)
4. [安装与初始化](#4-安装与初始化)
5. [服务管理](#5-服务管理)
6. [数据库管理](#6-数据库管理)
7. [SWORD 模块管理](#7-sword-模块管理)
8. [知识库索引管理](#8-知识库索引管理)
9. [nginx 配置](#9-nginx-配置)
10. [备份与恢复](#10-备份与恢复)
11. [监控与告警](#11-监控与告警)
12. [日志管理](#12-日志管理)
13. [故障排查](#13-故障排查)
14. [常见运维任务](#14-常见运维任务)
15. [安全注意事项](#15-安全注意事项)
16. [服务器部署清单](#16-服务器部署清单)

---

## 1. 系统概述

### 1.1 架构

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   nginx      │────▶│  前端 Node.js │     │  后端 JAR    │
│  (:80/:443)  │     │   (:3000)    │     │   (:8080)   │
│  反向代理     │     │  静态+Zvec   │     │  Spring Boot │
└──────────────┘     └──────────────┘     └──────────────┘
                           │                      │
                     ┌─────┴─────┐         ┌──────┴──────┐
                     │  Zvec 向量 │         │  H2 数据库  │
                     │  433K 向量 │         │   231MB    │
                     │  BIN 持久化│         │  text-db   │
                     └───────────┘         └─────────────┘
                                                 │
                                         ┌───────┴───────┐
                                         │ SWORD 模块    │
                                         │ 123 个/410MB  │
                                         └───────────────┘
```

### 1.2 组件

| 组件 | 端口 | 说明 |
|------|------|------|
| nginx | 80/443 | 反向代理、静态文件 |
| 前端 Node.js | 3000 | 静态文件服务 + API 代理 + Zvec 向量数据库 |
| 后端 JAR | 8080 | Spring Boot 单体应用 |
| H2 数据库 | - | 内嵌模式，文件存储 |

### 1.3 关键路径

| 路径 | 说明 |
|------|------|
| `/opt/bible-microservices/` | 服务器部署根目录 |
| `bible-monolith/build/libs/bible-monolith.jar` | 后端 JAR (75MB) |
| `frontend/` | 前端文件目录 |
| `data/text-db.mv.db` | H2 数据库 (231MB) |
| `data/sword-mods/` | SWORD 模块 (410MB) |
| `data/search-index/` | Lucene 搜索索引 |
| `frontend/data/*.bin` | Zvec 向量 BIN 文件 |
| `/etc/nginx/sites-enabled/default` | nginx 配置 |

---

## 2. 环境要求

### 2.1 软件依赖

| 软件 | 版本 | 用途 |
|------|------|------|
| JDK | 17+ | 后端运行 |
| Node.js | 16+ | 前端运行 |
| nginx | 1.18+ | 反向代理 |
| Git | 2.30+ | 代码管理 |

### 2.2 硬件要求

| 配置 | 最低 | 推荐 |
|------|------|------|
| CPU | 1 核 | 2 核 |
| 内存 | 1 GiB | 2 GiB |
| 磁盘 | 2 GB | 5 GB |
| 带宽 | 1 Mbps | 5 Mbps |

### 2.3 JVM 参数

```bash
java -Dfile.encoding=UTF-8 \
  -Xms48m -Xmx2g \
  -jar bible-monolith.jar \
  --sword.modules-path=/opt/bible-microservices/data/sword-mods
```

| 参数 | 说明 |
|------|------|
| -Xms48m | 初始堆内存 |
| -Xmx2g | 最大堆内存（索引构建需 2GB） |
| -Dfile.encoding=UTF-8 | 文件编码 |

> ⚠️ H2 索引构建时需 2GB 堆内存，正常运行 256MB 足够

---

## 3. 部署架构

### 3.1 本地开发环境

```
D:\dev\github\bible-microservices\
├── bible-monolith/          # 后端项目
│   ├── src/main/kotlin/     # 源码
│   ├── src/main/resources/  # 配置文件
│   ├── build/libs/          # JAR 产物
│   └── data/                 # H2 数据库
├── frontend/                # 前端项目
│   ├── index.html           # 桌面版
│   ├── m/                   # 手机版
│   ├── js/                  # JavaScript
│   ├── css/                 # 样式
│   ├── library-data/        # 图书馆数据
│   ├── plugins/             # 插件（知识库等）
│   └── server.js            # Node.js 服务
├── data/sword-mods/         # SWORD 模块
└── docs/                    # 文档
```

### 3.2 服务器环境

```
/opt/bible-microservices/
├── bible-monolith.jar       # 后端 JAR
├── frontend/                # 前端文件
├── data/
│   ├── text-db.mv.db        # H2 数据库
│   └── sword-mods/          # SWORD 模块
└── logs/                    # 日志目录
```

---

## 4. 安装与初始化

### 4.1 首次安装

```bash
# 1. 克隆代码
git clone https://github.com/EnochEnglish/bible-microservices.git
cd bible-microservices

# 2. 编译后端
cd bible-monolith
./gradlew bootJar -x test

# 3. 启动后端（注意 CWD 必须在项目根目录）
cd ..
java -Dfile.encoding=UTF-8 -Xms48m -Xmx2g \
  -jar bible-monolith/build/libs/bible-monolith.jar \
  --sword.modules-path=data/sword-mods

# 4. 启动前端
cd frontend
node server.js

# 5. 验证
curl http://localhost:8080/api/v1/bible/translations
curl http://localhost:3000/
```

### 4.2 服务器部署

```bash
# 在服务器上
mkdir -p /opt/bible-microservices
cd /opt/bible-microservices

# 上传文件（FTP 或 SCP）
# - bible-monolith.jar
# - frontend/ 目录
# - data/ 目录（仅 sword-mods，不覆盖 H2）

# 启动后端
nohup java -Dfile.encoding=UTF-8 -Xms48m -Xmx2g \
  -jar bible-monolith.jar \
  --sword.modules-path=data/sword-mods \
  > logs/monolith.log 2>&1 &

# 启动前端
cd frontend
nohup node server.js > ../logs/frontend.log 2>&1 &
```

---

## 5. 服务管理

### 5.1 启动服务

```bash
# 后端
cd /opt/bible-microservices
nohup java -Dfile.encoding=UTF-8 -Xms48m -Xmx2g \
  -jar bible-monolith.jar \
  --sword.modules-path=data/sword-mods \
  > logs/monolith.log 2>&1 &

# 前端
cd /opt/bible-microservices/frontend
nohup node server.js > ../logs/frontend.log 2>&1 &

# nginx
nginx -t && systemctl start nginx
```

### 5.2 停止服务

```bash
# 查找进程
tasklist | findstr java     # Windows
ps aux | grep java          # Linux

# 停止后端
kill -9 <java_pid>          # Linux
taskkill /F /PID <pid>     # Windows

# 停止前端
kill -9 <node_pid>

# 停止 nginx
nginx -s stop
# 或
systemctl stop nginx
```

### 5.3 重启服务

```bash
# 后端重启
kill -9 $(pgrep -f bible-monolith)
cd /opt/bible-microservices
nohup java -Dfile.encoding=UTF-8 -Xms48m -Xmx2g \
  -jar bible-monolith.jar \
  --sword.modules-path=data/sword-mods \
  > logs/monolith.log 2>&1 &

# 前端重启
kill -9 $(pgrep -f "node server.js")
cd /opt/bible-microservices/frontend
nohup node server.js > ../logs/frontend.log 2>&1 &

# nginx 重载
nginx -t && systemctl reload nginx
```

### 5.4 健康检查

```bash
# 后端
curl -s http://localhost:8080/actuator/health

# 前端
curl -s http://localhost:3000/

# API
curl -s http://localhost:8080/api/v1/bible/translations | head -c 200

# SWORD 模块
curl -s http://localhost:8080/api/v1/sword/modules | head -c 200

# Zvec 状态
curl -s http://localhost:3000/zvec/status
```

---

## 6. 数据库管理

### 6.1 H2 数据库

- **类型**：H2 文件模式
- **路径**：`data/text-db.mv.db` (231MB)
- **连接串**：`jdbc:h2:file:./data/text-db;DB_CLOSE_ON_EXIT=FALSE;MODE=MySQL`
- **用户名**：sa（无密码）

> ⚠️ **CWD 陷阱**：H2 相对路径从 JVM 启动时的 CWD 解析。必须确保 CWD 是项目根目录（包含 `data/` 目录），否则会创建空库。

### 6.2 H2 控制台

- 访问：`http://localhost:8080/h2-console`
- JDBC URL：`jdbc:h2:file:./data/text-db`
- 用户名：`sa`
- 密码：空

### 6.3 备份

```bash
# 备份 H2 数据库
cp data/text-db.mv.db data/text-db.backup.$(date +%Y%m%d).mv.db

# 备份 SWORD 模块（增量）
rsync -av data/sword-mods/ backup/sword-mods/

# 备份前端配置
cp -r frontend/data/ backup/frontend-data/

# 备份 KB BIN 向量
cp frontend/data/*.bin backup/
```

### 6.4 恢复

```bash
# 停止后端
kill -9 $(pgrep -f bible-monolith)

# 恢复 H2
cp data/text-db.backup.20260720.mv.db data/text-db.mv.db

# 重启后端
cd /opt/bible-microservices
nohup java -Dfile.encoding=UTF-8 -Xms48m -Xmx2g \
  -jar bible-monolith.jar \
  --sword.modules-path=data/sword-mods \
  > logs/monolith.log 2>&1 &
```

### 6.5 H2 文件锁

如果后端启动失败报 "Database may be already in use"，原因可能是：
- 旧 Java 进程未正确关闭
- H2 锁文件残留

```bash
# 查找残留 Java 进程
ps aux | grep java

# 强制杀掉
kill -9 <pid>

# 删除锁文件
rm -f data/text-db.mv.db.lock.db
rm -f data/text-db.mv.db.trace.db

# 重启
```

---

## 7. SWORD 模块管理

### 7.1 查看已安装模块

```bash
curl http://localhost:8080/api/v1/sword/modules | python3 -m json.tool | head -50
```

或通过前端：`http://localhost:3000/modules.html`

### 7.2 安装模块

```bash
# API 安装
curl -X POST http://localhost:8080/api/v1/sword/install \
  -H "Content-Type: application/json" \
  -d '{"initials": "KJV"}'

# 安装后需重新加载
curl -X POST http://localhost:8080/api/v1/sword/reload
```

### 7.3 批量安装

```bash
# 查看可用模块
curl http://localhost:8080/api/v1/sword/install/available | python3 -m json.tool | head -50

# 批量安装（示例）
for module in KJV BSB ChiUns OSHB LXX; do
  curl -X POST http://localhost:8080/api/v1/sword/install \
    -H "Content-Type: application/json" \
    -d "{\"initials\": \"$module\"}"
  sleep 2
done

# 重新加载
curl -X POST http://localhost:8080/api/v1/sword/reload
```

### 7.4 删除模块

```bash
curl -X DELETE http://localhost:8080/api/v1/sword/modules/KJV
```

### 7.5 Linux 大小写问题

> ⚠️ JSword 在 Linux 上区分大小写。如果地图/通用书模块返回空数据，可能需要创建符号链接：

```bash
cd data/sword-mods
ln -s BibleAtlas bibleatlas
ln -s BibleMap biblemap
```

---

## 8. 知识库索引管理

### 8.1 查看索引状态

```bash
# KB Stats
curl http://localhost:8080/api/v1/kb/stats

# Zvec 状态
curl http://localhost:3000/zvec/status
```

### 8.2 重建索引

```bash
# 清除所有 KB 数据
curl -X POST http://localhost:8080/api/v1/kb/clear-all

# 全量索引（中文 only）
curl -X POST http://localhost:8080/api/v1/kb/index/build-all?zhOnly=true

# 单模型索引
curl -X POST http://localhost:8080/api/v1/kb/index/build/tfidf_256
curl -X POST http://localhost:8080/api/v1/kb/index/build/bgesmall_512
curl -X POST http://localhost:8080/api/v1/kb/index/build/bgebase_768
```

### 8.3 索引数据量

| 集合 | 模型 | 条数 |
|------|------|------|
| bible | tfidf_256 | 6,705 |
| bible | bgesmall_512 | 6,705 |
| library | tfidf_256 | 28,478 |
| library | bgesmall_512 | 28,478 |
| dictionary | tfidf_256 | 103,730 |

### 8.4 Zvec BIN 文件

| 文件 | 大小 | 说明 |
|------|------|------|
| bible_tfidf_256.bin | ~2 MB | 圣经 TF-IDF |
| bible_bgesmall_512.bin | ~14 MB | 圣经 BGE-small |
| library_tfidf_256.bin | ~8 MB | 图书馆 TF-IDF |
| library_bgesmall_512.bin | ~56 MB | 图书馆 BGE-small |
| dictionary_tfidf_256.bin | ~28 MB | 词典 TF-IDF |

> ⚠️ BGE-base 索引需 2GB 堆内存，否则可能 OOM

### 8.5 Zvec 集合管理

```bash
# 查看所有集合
curl http://localhost:3000/zvec/collections

# 删除单个集合
curl -X DELETE http://localhost:3000/zvec/drop/tfidf_256_bible

# 加载模型
curl -X POST http://localhost:3000/zvec/load-model -H "Content-Type: application/json" -d '{"modelId":"bgesmall_512"}'
```

---

## 9. nginx 配置

### 9.1 配置文件

路径：`/etc/nginx/sites-enabled/default`（或 `/etc/nginx/conf.d/bible.conf`）

### 9.2 配置内容

```nginx
server {
    listen 80;
    server_name _;

    # 前端桌面版
    location /bible/ {
        alias /opt/bible-microservices/frontend/;
        index index.html;
        try_files $uri $uri/ /bible/index.html;
    }

    # 前端手机版
    location /bible/m/ {
        alias /opt/bible-microservices/frontend/m/;
        index index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 旧站共存
    location / {
        root /var/www/html/;
        index index.html;
    }
}
```

### 9.3 测试和重载

```bash
nginx -t          # 测试配置
systemctl reload nginx  # 重载
```

### 9.4 常见 nginx 问题

| 问题 | 原因 | 解决 |
|------|------|------|
| `duplicate default_server` | sites-enabled/ 下有 .bak 文件被 include | 将 .bak 移出 sites-enabled/ |
| 静态文件 404 | alias 路径错误或权限不足 | 检查路径和 `chown -R www-data:www-data` |
| 502 Bad Gateway | 后端未运行 | 检查后端进程和端口 |

---

## 10. 备份与恢复

### 10.1 备份策略

| 数据 | 频率 | 方式 |
|------|------|------|
| H2 数据库 | 每日 | cp 文件 |
| SWORD 模块 | 每月 | rsync 增量 |
| KB BIN 向量 | 每次索引重建后 | cp 文件 |
| 前端代码 | 每次部署 | Git commit |
| 配置文件 | 每次修改 | Git 版本控制 |

### 10.2 自动备份脚本

```bash
#!/bin/bash
# /opt/bible-microservices/backup.sh

BACKUP_DIR="/opt/bible-microservices/backup"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# H2 数据库
cp /opt/bible-microservices/data/text-db.mv.db $BACKUP_DIR/text-db.$DATE.mv.db

# 保留最近 7 天
find $BACKUP_DIR -name "text-db.*.mv.db" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# crontab
0 2 * * * /opt/bible-microservices/backup.sh
```

---

## 11. 监控与告警

### 11.1 监控指标

| 指标 | 正常范围 | 告警阈值 |
|------|----------|----------|
| 后端内存 | < 500MB | > 800MB |
| 前端内存 | < 500MB | > 1GB |
| H2 文件大小 | ~231MB | < 1KB（空库） |
| 磁盘可用 | > 5GB | < 1GB |
| API 响应 | < 500ms | > 5s |
| Zvec 向量数 | 433K+ | < 100K |

### 11.2 监控命令

```bash
# 进程状态
ps aux | grep -E "java|node"

# 内存使用
free -h

# 磁盘空间
df -h

# API 健康检查
curl -s -o /dev/null -w "%{http_code} %{time_total}s" http://localhost:8080/actuator/health

# Zvec 向量数
curl -s http://localhost:3000/zvec/status | grep vectors
```

### 11.3 告警脚本

```bash
#!/bin/bash
# 简单告警脚本
ALERT_EMAIL="admin@example.com"

# 检查后端
if ! curl -s http://localhost:8080/actuator/health > /dev/null; then
    echo "ALERT: Backend is down!" | mail -s "Bible Backend Down" $ALERT_EMAIL
fi

# 检查前端
if ! curl -s http://localhost:3000/ > /dev/null; then
    echo "ALERT: Frontend is down!" | mail -s "Bible Frontend Down" $ALERT_EMAIL
fi

# 检查磁盘
DISK=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ $DISK -gt 90 ]; then
    echo "ALERT: Disk usage ${DISK}%" | mail -s "Disk Space Warning" $ALERT_EMAIL
fi
```

---

## 12. 日志管理

### 12.1 日志文件

| 日志 | 路径 | 说明 |
|------|------|------|
| 后端日志 | `logs/monolith.log` | Spring Boot 输出 |
| 前端日志 | `logs/frontend.log` | Node.js 输出 |
| nginx 访问日志 | `/var/log/nginx/access.log` | HTTP 请求 |
| nginx 错误日志 | `/var/log/nginx/error.log` | nginx 错误 |

### 12.2 查看日志

```bash
# 后端实时日志
tail -f /opt/bible-microservices/logs/monolith.log

# 前端实时日志
tail -f /opt/bible-microservices/logs/frontend.log

# nginx 错误
tail -f /var/log/nginx/error.log

# 搜索特定错误
grep -i "error\|exception\|failed" logs/monolith.log | tail -20
```

### 12.3 日志轮转

```bash
# /etc/logrotate.d/bible-monolith
/opt/bible-microservices/logs/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    copytruncate
}
```

---

## 13. 故障排查

### 13.1 后端启动失败

| 症状 | 可能原因 | 解决方案 |
|------|----------|----------|
| H2 文件锁 | 旧进程未关闭 | `kill -9 $(pgrep java)` |
| 空库（0 条译本） | CWD 不对 | 确保从项目根目录启动 |
| 端口被占 | 8080 已用 | `lsof -i:8080` 找到并杀掉 |
| OutOfMemoryError | 堆内存不足 | 增大 -Xmx |
| ClassNotFoundException | JAR 损坏 | 重新编译 |

### 13.2 前端启动失败

| 症状 | 可能原因 | 解决方案 |
|------|----------|----------|
| 端口 3000 被占 | 其他进程占用 | `lsof -i:3000` |
| Zvec 加载崩溃 | BIN 文件损坏 | 重新索引生成 BIN |
| 静态文件 404 | 路径不对 | 检查 server.js 的工作目录 |

### 13.3 API 返回 500

```bash
# 查看后端日志最后 50 行
tail -50 logs/monolith.log | grep -A5 "Exception"

# 常见原因：
# 1. H2 重复数据 → findBy 改为 findFirstBy
# 2. SWORD 模块路径错误 → 检查 --sword.modules-path
# 3. 内存不足 → 增大 -Xmx
```

### 13.4 知识库搜索超时

```bash
# BGE 嵌入通过 HTTP 调用前端 Zvec bridge，太慢
# 解决方案：确保前端 Zvec 已加载模型

# 检查模型加载
curl http://localhost:3000/zvec/status

# 手动加载模型
curl -X POST http://localhost:3000/zvec/load-model \
  -H "Content-Type: application/json" \
  -d '{"modelId":"bgesmall_512"}'
```

### 13.5 Git Push 被 GFW 阻断

```bash
# 尝试 SSH
git remote set-url origin git@github.com:EnochEnglish/bible-microservices.git

# 或配置代理
git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy http://127.0.0.1:7890

# 或使用 Gitee 镜像
git remote add gitee https://gitee.com/EnochEnglish/bible-microservices.git
git push gitee monolith-clean
```

---

## 14. 常见运维任务

### 14.1 更新后端

```bash
# 1. 编译新 JAR
cd D:\dev\github\bible-microservices\bible-monolith
./gradlew bootJar -x test

# 2. 上传到服务器（FTP 或 SCP）
# 3. 停止旧后端
kill -9 $(pgrep -f bible-monolith)

# 4. 替换 JAR
cp bible-monolith/build/libs/bible-monolith.jar /opt/bible-microservices/

# 5. 启动新后端
cd /opt/bible-microservices
nohup java -Dfile.encoding=UTF-8 -Xms48m -Xmx2g \
  -jar bible-monolith.jar \
  --sword.modules-path=data/sword-mods \
  > logs/monolith.log 2>&1 &

# 6. 验证
curl http://localhost:8080/actuator/health
```

### 14.2 更新前端

```bash
# 1. 上传前端文件到服务器
# 2. 重启前端
kill -9 $(pgrep -f "node server.js")
cd /opt/bible-microservices/frontend
nohup node server.js > ../logs/frontend.log 2>&1 &

# 3. 浏览器 Ctrl+F5 硬刷新
```

### 14.3 前端版本号更新

每次修改前端 JS/CSS 后，必须更新版本号以避免缓存：

**需要更新的文件**：
- `index.html`（桌面版 script src 版本号）
- `m/index.html`（手机版 script src 版本号）

**格式**：`v=YYYYMMDDx`（x 为当天序号 a/b/c...）

### 14.4 添加新 SWORD 模块

```bash
# 通过 API 安装
curl -X POST http://localhost:8080/api/v1/sword/install \
  -H "Content-Type: application/json" \
  -d '{"initials": "NewModule"}'

# 重新加载
curl -X POST http://localhost:8080/api/v1/sword/reload

# 验证
curl http://localhost:8080/api/v1/sword/modules | grep NewModule
```

### 14.5 重建知识库索引

```bash
# 全量重建（需 2GB 堆内存）
curl -X POST http://localhost:8080/api/v1/kb/clear-all
curl -X POST "http://localhost:8080/api/v1/kb/index/build-all?zhOnly=true"

# 监控进度
tail -f logs/monolith.log | grep "Processing\|Indexing\|Completed"
```

---

## 15. 安全注意事项

### 15.1 默认密码

- **管理员**：admin / admin123
- **H2 数据库**：sa / （空密码）
- **JWT secret**：预置在 application.yml

> ⚠️ 生产环境必须修改以上默认值

### 15.2 JWT 配置

```yaml
jwt:
  secret: <your-strong-secret>  # 修改为随机字符串
  expiration-ms: 86400000      # 24 小时
```

### 15.3 网络安全

- H2 控制台不应暴露到公网
- 管理后台建议加 IP 白名单
- 生产环境启用 HTTPS
- 定期备份数据

### 15.4 文件权限

```bash
chown -R www-data:www-data /opt/bible-microservices/frontend/
chmod 644 /opt/bible-microservices/frontend/*.html
chmod 755 /opt/bible-microservices/frontend/js/
```

---

## 16. 服务器部署清单

### 16.1 部署前检查

- [ ] JDK 17 已安装
- [ ] Node.js 16+ 已安装
- [ ] nginx 已安装
- [ ] 磁盘空间 > 5GB
- [ ] 内存 > 1GB
- [ ] 防火墙开放 80/443 端口

### 16.2 部署步骤

- [ ] 上传 bible-monolith.jar
- [ ] 上传 frontend/ 目录
- [ ] 上传 data/sword-mods/ 目录
- [ ] 创建 data/ 目录（H2 数据库存放）
- [ ] 配置 nginx
- [ ] 启动后端
- [ ] 启动前端
- [ 验证 API
- [ ] 验证前端
- [ ] 修改管理员密码
- [ ] 配置 HTTPS（可选）

### 16.3 部署后验证

```bash
# API
curl http://localhost:8080/api/v1/bible/translations
curl http://localhost:8080/api/v1/sword/modules
curl http://localhost:8080/actuator/health

# 前端
curl http://localhost:3000/
curl http://localhost:3000/m/

# nginx
curl http://localhost/bible/
curl http://localhost/api/v1/bible/translations
```

### 16.4 服务器信息

| 项目 | 值 |
|------|-----|
| ECS IP | 8.222.165.245 |
| SSH 用户 | ccscw |
| 部署路径 | /opt/bible-microservices/ |
| nginx 配置 | /etc/nginx/sites-enabled/default |

---

*本文档最后更新：2026-07-23*
