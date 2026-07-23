# Bible Monolith — 运维人员手册

> 版本：v2.0 | 更新日期：2026-07-23

---

## 目录

1. [系统概述](#1-系统概述)
2. [环境要求](#2-环境要求)
3. [环境配置体系](#3-环境配置体系)
4. [环境变量设置](#4-环境变量设置)
5. [安装与部署](#5-安装与部署)
6. [服务管理](#6-服务管理)
7. [数据库管理](#7-数据库管理)
8. [SWORD 模块管理](#8-sword-模块管理)
9. [知识库索引管理](#9-知识库索引管理)
10. [nginx 配置](#10-nginx-配置)
11. [备份与恢复](#11-备份与恢复)
12. [监控与告警](#12-监控与告警)
13. [日志管理](#13-日志管理)
14. [故障排查](#14-故障排查)
15. [常见运维任务](#15-常见运维任务)
16. [部署清单](#16-部署清单)

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
                     │  BIN 持久化│         │  文件模式   │
                     └───────────┘         └─────────────┘
                                                 │
                                         ┌───────┴───────┐
                                         │ SWORD 模块    │
                                         └───────────────┘
```

### 1.2 组件

| 组件 | 端口 | 说明 |
|------|------|------|
| nginx | 80/443 | 反向代理、静态文件 |
| 前端 Node.js | 3000 | 静态文件服务 + API 代理 + Zvec 向量数据库 |
| 后端 JAR | 8080 | Spring Boot 单体应用 |
| H2 数据库 | — | 内嵌模式，文件存储 |

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

### 2.3 JVM 参数

| 场景 | 参数 | 说明 |
|------|------|------|
| 正常运行 | `-Xms128m -Xmx512m` | 日常服务 |
| 索引构建 | `-Xms128m -Xmx2g` | KB 全量索引需 2GB |

---

## 3. 环境配置体系

### 3.1 三环境配置文件

| 环境 | Profile | 配置文件 | 提交代码库 |
|------|---------|----------|------------|
| 开发 | dev | `application.yml` | ✅ |
| 测试 | uat | `application-uat.yml` | ❌ |
| 生产 | prod | `application-prod.yml` | ❌ |

> uat/prod 配置文件需手动放置到服务器 JAR 同目录，Spring Boot 自动加载。

### 3.2 启动命令

```bash
java -jar bible-monolith.jar                              # dev
java -jar bible-monolith.jar --spring.profiles.active=uat  # uat
java -jar bible-monolith.jar --spring.profiles.active=prod # prod
```

### 3.3 环境差异对照

| 配置项 | dev | uat | prod |
|--------|-----|-----|------|
| 密码存储 | 明文 | BCrypt | BCrypt |
| H2 控制台 | 开启 | 关闭 | 关闭 |
| JWT 有效期 | 24h | 8h | 2h |
| 日志级别 | DEBUG | INFO | WARN |
| Actuator | 全量 | health,info | 仅 health |
| 上传限制 | 100MB | 50MB | 10MB |
| 敏感值 | 硬编码 | 环境变量 | 环境变量 |

---

## 4. 环境变量设置

### 4.1 变量清单

uat/prod 环境必须设置：

| 变量名 | 用途 | 生成方式 |
|--------|------|----------|
| `JWT_SECRET` | JWT 签名密钥 | `openssl rand -base64 64` |
| `H2_PASSWORD` | H2 数据库密码 | `openssl rand -base64 32` |
| `ADMIN_PASSWORD` | 管理员密码 | `openssl rand -base64 12` |
| `PRINCIPAL_PASSWORD` | 校长密码 | `openssl rand -base64 12` |

可选：

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `ADMIN_USERNAME` | admin | 管理员用户名 |
| `PRINCIPAL_USERNAME` | principal | 校长用户名 |

### 4.2 Linux 设置方法

**方式一：密钥文件 + 启动脚本（推荐）**

```bash
# 1. 创建密钥目录
sudo mkdir -p /etc/bible/secrets
sudo chmod 700 /etc/bible/secrets

# 2. 生成随机密钥
openssl rand -base64 64 | sudo tee /etc/bible/secrets/jwt-secret.txt
openssl rand -base64 32 | sudo tee /etc/bible/secrets/h2-password.txt
openssl rand -base64 12 | sudo tee /etc/bible/secrets/admin-password.txt
openssl rand -base64 12 | sudo tee /etc/bible/secrets/principal-password.txt

# 3. 设置权限
sudo chmod 600 /etc/bible/secrets/*.txt

# 4. 创建启动脚本
cat > /opt/bible-microservices/start.sh << 'EOF'
#!/bin/bash
export JWT_SECRET=$(cat /etc/bible/secrets/jwt-secret.txt)
export H2_PASSWORD=$(cat /etc/bible/secrets/h2-password.txt)
export ADMIN_PASSWORD=$(cat /etc/bible/secrets/admin-password.txt)
export PRINCIPAL_PASSWORD=$(cat /etc/bible/secrets/principal-password.txt)

cd /opt/bible-microservices
nohup java -Dfile.encoding=UTF-8 -Xms128m -Xmx1g \
  -jar bible-monolith.jar \
  --spring.profiles.active=prod \
  > logs/monolith.log 2>&1 &
echo "Started PID: $!"
EOF
chmod +x /opt/bible-microservices/start.sh

# 5. 启动
/opt/bible-microservices/start.sh
```

**方式二：systemd 服务（生产推荐）**

```bash
# 1. 创建环境变量文件
sudo tee /etc/bible/secrets/env << 'EOF'
JWT_SECRET=你的密钥
H2_PASSWORD=你的密码
ADMIN_PASSWORD=你的密码
PRINCIPAL_PASSWORD=你的密码
EOF
sudo chmod 600 /etc/bible/secrets/env

# 2. 创建服务
sudo tee /etc/systemd/system/bible-monolith.service << 'EOF'
[Unit]
Description=Bible Monolith
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/bible-microservices
EnvironmentFile=/etc/bible/secrets/env
ExecStart=/usr/bin/java -Dfile.encoding=UTF-8 -Xms128m -Xmx1g -jar bible-monolith.jar --spring.profiles.active=prod
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 3. 启动
sudo systemctl daemon-reload
sudo systemctl enable bible-monolith
sudo systemctl start bible-monolith

# 4. 查看状态
sudo systemctl status bible-monolith
```

**方式三：临时 export（调试用）**

```bash
export JWT_SECRET=$(openssl rand -base64 64)
export H2_PASSWORD=$(openssl rand -base64 32)
export ADMIN_PASSWORD=$(openssl rand -base64 12)
export PRINCIPAL_PASSWORD=$(openssl rand -base64 12)

java -jar bible-monolith.jar --spring.profiles.active=prod
```

### 4.3 Windows 设置方法

**方式一：PowerShell 密钥文件 + 启动脚本（推荐）**

```powershell
# 1. 创建密钥目录
$secretDir = "C:\secrets\bible"
New-Item -ItemType Directory -Path $secretDir -Force

# 2. 生成密钥
function New-Secret($size) {
    $b = [byte[]]::new($size)
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
    [Convert]::ToBase64String($b)
}

New-Secret 64 | Out-File -Encoding ascii "$secretDir\jwt-secret.txt"
New-Secret 32 | Out-File -Encoding ascii "$secretDir\h2-password.txt"
New-Secret 12 | Out-File -Encoding ascii "$secretDir\admin-password.txt"
New-Secret 12 | Out-File -Encoding ascii "$secretDir\principal-password.txt"

# 3. 创建启动脚本
$startScript = @'
$env:JWT_SECRET = Get-Content -Raw "C:\secrets\bible\jwt-secret.txt"
$env:H2_PASSWORD = Get-Content -Raw "C:\secrets\bible\h2-password.txt"
$env:ADMIN_PASSWORD = Get-Content -Raw "C:\secrets\bible\admin-password.txt"
$env:PRINCIPAL_PASSWORD = Get-Content -Raw "C:\secrets\bible\principal-password.txt"

Set-Location "D:\bible"
java -Dfile.encoding=UTF-8 -Xms128m -Xmx1g `
  -jar bible-monolith.jar `
  --spring.profiles.active=prod
'@
$startScript | Out-File -Encoding utf8 "D:\bible\start-prod.ps1"

# 4. 启动
.\start-prod.ps1
```

**方式二：PowerShell 临时变量（调试用）**

```powershell
$env:JWT_SECRET = [Convert]::ToBase64String(
    [Security.Cryptography.RandomNumberGenerator]::GetBytes(64)
)
$env:H2_PASSWORD = [Convert]::ToBase64String(
    [Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
)
$env:ADMIN_PASSWORD = [Convert]::ToBase64String(
    [Security.Cryptography.RandomNumberGenerator]::GetBytes(12)
)
$env:PRINCIPAL_PASSWORD = [Convert]::ToBase64String(
    [Security.Cryptography.RandomNumberGenerator]::GetBytes(12)
)

java -jar bible-monolith.jar --spring.profiles.active=prod
```

**方式三：系统环境变量（永久）**

```powershell
# 需要管理员权限
[Environment]::SetEnvironmentVariable("JWT_SECRET", "你的密钥", "Machine")
[Environment]::SetEnvironmentVariable("H2_PASSWORD", "你的密码", "Machine")
[Environment]::SetEnvironmentVariable("ADMIN_PASSWORD", "你的密码", "Machine")
[Environment]::SetEnvironmentVariable("PRINCIPAL_PASSWORD", "你的密码", "Machine")

# 重启 PowerShell 后生效
java -jar bible-monolith.jar --spring.profiles.active=prod
```

### 4.4 验证环境变量

```bash
# Linux
echo "JWT_SECRET set: ${JWT_SECRET:+yes}"
echo "H2_PASSWORD set: ${H2_PASSWORD:+yes}"
echo "ADMIN_PASSWORD set: ${ADMIN_PASSWORD:+yes}"
echo "PRINCIPAL_PASSWORD set: ${PRINCIPAL_PASSWORD:+yes}"
```

```powershell
# Windows
"JWT_SECRET set: $(if($env:JWT_SECRET){'yes'}else{'NO'})"
"H2_PASSWORD set: $(if($env:H2_PASSWORD){'yes'}else{'NO'})"
"ADMIN_PASSWORD set: $(if($env:ADMIN_PASSWORD){'yes'}else{'NO'})"
"PRINCIPAL_PASSWORD set: $(if($env:PRINCIPAL_PASSWORD){'yes'}else{'NO'})"
```

---

## 5. 安装与部署

### 5.1 本地开发

```bash
# 1. 克隆代码
git clone https://github.com/EnochEnglish/bible-microservices.git
cd bible-microservices

# 2. 编译后端
cd bible-monolith
./gradlew bootJar -x test

# 3. 启动后端（dev 模式，CWD 必须在项目根目录）
cd ..
java -Dfile.encoding=UTF-8 -Xms128m -Xmx1g \
  -jar bible-monolith/build/libs/bible-monolith.jar

# 4. 启动前端
cd frontend
node server.js

# 5. 验证
curl http://localhost:8080/api/v1/bible/translations
curl http://localhost:3000/
```

### 5.2 服务器部署

```bash
# 1. 创建目录
mkdir -p /opt/bible-microservices/logs

# 2. 上传文件
#   - bible-monolith.jar
#   - application-uat.yml 或 application-prod.yml（放置在 JAR 同目录）
#   - frontend/ 目录
#   - data/sword-mods/ 目录

# 3. 生成密钥（参见环境变量设置章节）

# 4. 启动后端
cd /opt/bible-microservices
nohup java -Dfile.encoding=UTF-8 -Xms128m -Xmx1g \
  -jar bible-monolith.jar \
  --spring.profiles.active=prod \
  > logs/monolith.log 2>&1 &

# 5. 启动前端
cd frontend
nohup node server.js > ../logs/frontend.log 2>&1 &

# 6. 验证
curl http://localhost:8080/actuator/health
curl http://localhost:3000/
```

---

## 6. 服务管理

### 6.1 启动

```bash
# 后端（prod）
cd /opt/bible-microservices
export JWT_SECRET=$(cat /etc/bible/secrets/jwt-secret.txt)
export H2_PASSWORD=$(cat /etc/bible/secrets/h2-password.txt)
export ADMIN_PASSWORD=$(cat /etc/bible/secrets/admin-password.txt)
export PRINCIPAL_PASSWORD=$(cat /etc/bible/secrets/principal-password.txt)

nohup java -Dfile.encoding=UTF-8 -Xms128m -Xmx1g \
  -jar bible-monolith.jar \
  --spring.profiles.active=prod \
  > logs/monolith.log 2>&1 &

# 前端
cd /opt/bible-microservices/frontend
nohup node server.js > ../logs/frontend.log 2>&1 &

# nginx
sudo nginx -t && sudo systemctl start nginx
```

### 6.2 停止

```bash
# Linux
kill $(pgrep -f bible-monolith)
kill $(pgrep -f "node server.js")
sudo nginx -s stop

# Windows
taskkill /F /PID <java_pid>
taskkill /F /PID <node_pid>
```

### 6.3 重启

```bash
# 后端
kill $(pgrep -f bible-monolith); sleep 2
cd /opt/bible-microservices
# 重新执行启动命令

# nginx 重载配置
sudo nginx -t && sudo systemctl reload nginx
```

### 6.4 健康检查

```bash
curl -s http://localhost:8080/actuator/health
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/
curl -s http://localhost:8080/api/v1/bible/translations | head -c 200
curl -s http://localhost:3000/zvec/status
```

---

## 7. 数据库管理

### 7.1 H2 数据库

- **路径**：`data/text-db.mv.db`
- **连接串**：`jdbc:h2:file:./data/text-db;DB_CLOSE_ON_EXIT=FALSE;MODE=MySQL`

> ⚠️ **CWD 陷阱**：H2 相对路径从 JVM 启动时的 CWD 解析。必须确保 CWD 是项目根目录（包含 `data/` 目录），否则会创建空库。

### 7.2 H2 文件锁

启动失败报 "Database may be already in use" 时：

```bash
# 查找残留 Java 进程
ps aux | grep java    # Linux
tasklist | findstr java  # Windows

# 强制杀掉
kill -9 <pid>         # Linux
taskkill /F /PID <pid>  # Windows

# 删除锁文件
rm -f data/text-db.mv.db.lock.db
rm -f data/text-db.mv.db.trace.db
```

### 7.3 H2 控制台

| 环境 | 可用 | 路径 |
|------|------|------|
| dev | ✅ | `http://localhost:8080/h2-console` |
| uat/prod | ❌ 关闭 | — |

---

## 8. SWORD 模块管理

### 8.1 查看已安装模块

```bash
curl http://localhost:8080/api/v1/sword/modules | python3 -m json.tool | head -50
```

### 8.2 安装模块

```bash
curl -X POST http://localhost:8080/api/v1/sword/install \
  -H "Content-Type: application/json" \
  -d '{"initials": "KJV"}'

# 安装后重新加载
curl -X POST http://localhost:8080/api/v1/sword/reload
```

### 8.3 Linux 大小写问题

JSword 在 Linux 上区分大小写。如果地图/通用书模块返回空数据：

```bash
cd data/sword-mods
ln -s BibleAtlas bibleatlas
ln -s BibleMap biblemap
```

---

## 9. 知识库索引管理

### 9.1 查看状态

```bash
curl http://localhost:8080/api/v1/kb/stats
curl http://localhost:3000/zvec/status
```

### 9.2 重建索引

```bash
# 清除
curl -X POST http://localhost:8080/api/v1/kb/clear-all

# 全量索引（中文）
curl -X POST "http://localhost:8080/api/v1/kb/index/build-all?zhOnly=true"

# 单模型
curl -X POST http://localhost:8080/api/v1/kb/index/build/tfidf_256
curl -X POST http://localhost:8080/api/v1/kb/index/build/bgesmall_512
```

> ⚠️ 全量索引需 2GB 堆内存（`-Xmx2g`）

### 9.3 Zvec 集合管理

```bash
# 查看集合
curl http://localhost:3000/zvec/collections

# 删除集合
curl -X DELETE http://localhost:3000/zvec/drop/tfidf_256_bible

# 加载模型
curl -X POST http://localhost:3000/zvec/load-model \
  -H "Content-Type: application/json" \
  -d '{"modelId":"bgesmall_512"}'
```

---

## 10. nginx 配置

```nginx
server {
    listen 80;
    server_name _;

    # 安全头
    server_tokens off;
    client_max_body_size 10M;

    # 前端
    location /bible/ {
        alias /opt/bible-microservices/frontend/;
        index index.html;
        try_files $uri $uri/ /bible/index.html;
    }

    # 手机版
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

    # 安全拦截
    location /h2-console { deny all; return 403; }
    location /actuator { deny all; return 403; }

    # 根路径
    location / {
        root /var/www/html/;
        index index.html;
    }
}
```

```bash
# 测试和重载
sudo nginx -t
sudo systemctl reload nginx
```

---

## 11. 备份与恢复

### 11.1 备份

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
# crontab 每日 2:00 备份
0 2 * * * /opt/bible-microservices/backup.sh
```

### 11.2 恢复

```bash
# 停止后端
kill $(pgrep -f bible-monolith)

# 恢复
cp /opt/bible-microservices/backup/text-db.20260720.mv.db \
   /opt/bible-microservices/data/text-db.mv.db

# 重启
cd /opt/bible-microservices
# 执行启动命令
```

---

## 12. 监控与告警

### 12.1 监控指标

| 指标 | 正常 | 告警 |
|------|------|------|
| 后端内存 | < 500MB | > 800MB |
| 前端内存 | < 500MB | > 1GB |
| API 响应 | < 500ms | > 5s |
| 磁盘可用 | > 5GB | < 1GB |

### 12.2 监控命令

```bash
# 进程
ps aux | grep -E "java|node"

# 内存
free -h

# 磁盘
df -h

# API 健康
curl -s -o /dev/null -w "%{http_code} %{time_total}s" http://localhost:8080/actuator/health

# Zvec 向量数
curl -s http://localhost:3000/zvec/status
```

---

## 13. 日志管理

### 13.1 日志路径

| 日志 | 路径 |
|------|------|
| 后端 | `logs/monolith.log` |
| 前端 | `logs/frontend.log` |
| nginx 访问 | `/var/log/nginx/access.log` |
| nginx 错误 | `/var/log/nginx/error.log` |

### 13.2 查看日志

```bash
tail -f /opt/bible-microservices/logs/monolith.log
grep -i "error\|exception" logs/monolith.log | tail -20
```

### 13.3 日志轮转

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

## 14. 故障排查

### 14.1 后端启动失败

| 症状 | 原因 | 解决 |
|------|------|------|
| H2 文件锁 | 旧进程未关闭 | 杀进程 + 删锁文件 |
| 空库（0 条译本） | CWD 不对 | 确保从项目根目录启动 |
| 端口被占 | 8080 已用 | `lsof -i:8080`（Linux）/ `netstat -ano | findstr 8080`（Windows） |
| OutOfMemoryError | 堆内存不足 | 增大 `-Xmx` |
| 环境变量缺失 | uat/prod 未设置变量 | 参见第 4 章设置环境变量 |

### 14.2 前端启动失败

| 症状 | 原因 | 解决 |
|------|------|------|
| 端口 3000 被占 | 其他进程占用 | `lsof -i:3000` / `netstat -ano | findstr 3000` |
| Zvec 加载崩溃 | BIN 文件损坏 | 重新索引生成 BIN |

### 14.3 API 500 错误

```bash
tail -50 logs/monolith.log | grep -A5 "Exception"
# 常见原因：H2 重复数据、SWORD 模块路径错误、内存不足
```

---

## 15. 常见运维任务

### 15.1 更新后端

```bash
# 1. 编译新 JAR
cd bible-monolith && ./gradlew bootJar -x test

# 2. 停止旧后端
kill $(pgrep -f bible-monolith)

# 3. 替换 JAR
cp bible-monolith/build/libs/bible-monolith.jar /opt/bible-microservices/

# 4. 启动（使用对应环境的启动命令）
# 5. 验证
curl http://localhost:8080/actuator/health
```

### 15.2 更新前端

```bash
# 上传前端文件 → 重启前端
kill $(pgrep -f "node server.js")
cd /opt/bible-microservices/frontend
nohup node server.js > ../logs/frontend.log 2>&1 &
```

### 15.3 前端版本号

每次修改前端 JS/CSS 后必须更新版本号避免缓存：
- 格式：`v=YYYYMMDDx`（x 为当天序号 a/b/c...）
- 需更新：`index.html`、`m/index.html` 中的 script/link 标签

---

## 16. 部署清单

### 部署前

- [ ] JDK 17 已安装
- [ ] Node.js 16+ 已安装
- [ ] nginx 已安装
- [ ] 磁盘空间 > 5GB
- [ ] 内存 > 1GB

### 配置文件

- [ ] `application-uat.yml` 或 `application-prod.yml` 已放置到 JAR 同目录
- [ ] 该文件不在代码库中（.gitignore 已排除）

### 环境变量

- [ ] `JWT_SECRET` 已生成并设置
- [ ] `H2_PASSWORD` 已生成并设置
- [ ] `ADMIN_PASSWORD` 已生成并设置
- [ ] `PRINCIPAL_PASSWORD` 已生成并设置
- [ ] 密钥文件权限 600
- [ ] 密钥已保存到密码管理器

### 文件上传

- [ ] `bible-monolith.jar` 已上传
- [ ] `frontend/` 目录已上传
- [ ] `data/sword-mods/` 已上传
- [ ] `data/` 目录已创建（H2 数据库存放位置）

### 网络安全

- [ ] nginx 配置完成
- [ ] H2 控制台拦截已配置
- [ ] Actuator 拦截已配置
- [ ] HTTPS 证书已配置（可选）

### 验证

```bash
curl http://localhost:8080/actuator/health
curl http://localhost:8080/api/v1/bible/translations
curl http://localhost:3000/
curl http://localhost:3000/m/
```

---

*本文档最后更新：2026-07-23*
