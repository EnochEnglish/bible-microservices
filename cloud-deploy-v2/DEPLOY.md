# Bible Microservices v2.0 — 云服务器部署指南

> 适用于 Linux 服务器（Ubuntu 20.04+/Debian 11+/CentOS 7+）  
> 最低配置：2核 CPU / 4GB 内存 / 10GB 磁盘

---

## 目录

1. [架构概览](#架构概览)
2. [环境要求](#环境要求)
3. [快速部署（5 步）](#快速部署5-步)
4. [服务列表与端口](#服务列表与端口)
5. [Nginx 反向代理](#nginx-反向代理)
6. [防火墙配置](#防火墙配置)
7. [HTTPS 配置](#https-配置推荐)
8. [数据备份与恢复](#数据备份与恢复)
9. [日志管理](#日志管理)
10. [故障排查](#故障排查)
11. [自启动配置](#自启动配置推荐)

---

## 架构概览

```
用户浏览器
    │
    ▼
 Nginx (80/443) ─── 反向代理
    │
    ▼
 Frontend (3000)   ─── Node.js 静态服务 + API 代理
    │
    ├──► Gateway (8080)     ─── Spring Cloud Gateway (API 路由)
    │       ├──► Text (8081)        ─── 经文查询 / 注释 / Strong's / 书签 / 笔记 / 词典
    │       ├──► Search (8082)      ─── 全文搜索
    │       ├──► Module (8083)      ─── 模块管理
    │       └──► Sword (8086)       ─── SWORD 逐词对照 / Interlinear
    │
    └──► Auth (8084)        ─── JWT 认证 (直连)
```

- **对外端口**：只要开放 80/443（Nginx），内部端口仅 localhost 访问
- **数据存储**：H2 文件数据库（`data/` 目录，无需安装数据库服务）
- **缓存**：Caffeine 内存缓存（SWORD 模块读取）

---

## 环境要求

### 1. 安装 Java 17+

```bash
# Ubuntu / Debian
sudo apt update
sudo apt install openjdk-17-jdk -y

# CentOS / RHEL 7
sudo yum install java-17-openjdk -y

# CentOS / RHEL 8+
sudo dnf install java-17-openjdk -y
```

验证：
```bash
java -version
# 输出：openjdk version "17.x.x"
```

### 2. 安装 Node.js 18+

```bash
# 使用 NodeSource（推荐）
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 或使用 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
```

验证：
```bash
node -v   # v18.x.x
```

---

## 快速部署（5 步）

### 第一步：上传部署包

```bash
# 将 cloud-deploy-v2.zip 上传到服务器
scp cloud-deploy-v2.zip root@YOUR_SERVER_IP:/opt/

# SSH 登录
ssh root@YOUR_SERVER_IP
```

### 第二步：解压

```bash
cd /opt
unzip cloud-deploy-v2.zip -d bible-microservices
cd bible-microservices
chmod +x start.sh stop.sh
```

### 第三步：启动服务

```bash
./start.sh
```

输出示例：
```
==========================================
  Bible Microservices v2.0
  Starting all 7 services...
==========================================
[1/7] Starting Text Service on port 8081...        PID: 12345
[2/7] Starting Search Service on port 8082...      PID: 12346
[3/7] Starting Module Service on port 8083...      PID: 12347
[4/7] Starting Auth Service on port 8084...        PID: 12348
[5/7] Starting Sword Service on port 8086...       PID: 12349
[6/7] Starting Gateway on port 8080...             PID: 12350
[7/7] Starting Frontend on port 3000...            PID: 12351
==========================================
  All 7 services launched!
```

> ⚠️ Spring Boot 服务需要 ~20 秒初始化。等 20 秒后再验证。

### 第四步：验证

```bash
# 等待 20 秒后验证
sleep 20

# 前端页面
curl -s http://localhost:3000/ | head -20

# 经文 API
curl http://localhost:3000/api/v1/bible/translations

# KJV 约翰福音 3:16
curl "http://localhost:3000/api/v1/bible/kjv/john/3/16"
```

### 第五步：配置 Nginx（可选但推荐）

见下方 [Nginx 反向代理](#nginx-反向代理) 章节。

---

## 服务列表与端口

| 服务 | 端口 | 技术栈 | 功能 |
|------|------|--------|------|
| **Frontend** | 3000 | Node.js | 静态页面 + API 代理 |
| **Gateway** | 8080 | Spring Cloud Gateway | API 路由分发 |
| **Text Service** | 8081 | Spring Boot + Kotlin | 经文/注释/Strong's/词典/书签/笔记 |
| **Search Service** | 8082 | Spring Boot + Kotlin | 全文检索引擎 |
| **Module Service** | 8083 | Spring Boot + Kotlin | SWORD 模块安装/管理 |
| **Auth Service** | 8084 | Spring Boot + Kotlin + JWT | 用户认证/权限管理 |
| **Sword Service** | 8086 | Spring Boot + Kotlin + JSword | SWORD 模块读取/Interlinear |

### API 端点速查

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/v1/bible/translations` | GET | 可用译本列表 |
| `/api/v1/bible/{trans}/{book}/{chapter}` | GET | 经文查询 |
| `/api/v1/bible/{trans}/{book}/{chapter}/{verse}` | GET | 单节查询 |
| `/api/v1/search/{trans}?query=word` | GET | 全文搜索 |
| `/api/v1/strongs/{id}` | GET | Strong's 字典查询 |
| `/api/v1/annotations/commentaries/{book}/{chapter}` | GET | 注释获取 |
| `/api/v1/dictionaries/sources` | GET | 词典源列表 |
| `/api/v1/sword/modules/available` | GET | 可用 SWORD 模块 |
| `/api/v1/auth/login` | POST | 用户登录 |
| `/api/v1/auth/register` | POST | 用户注册 |
| `/api/v1/bookmarks` | GET | 书签列表（需登录） |
| `/api/v1/notes` | GET | 笔记列表（需登录） |
| `/api/v1/genbook/{module}/keys` | GET | 灵修/通用书键列表 |
| `/api/v1/genbook/{module}/content?key={key}` | GET | 灵修/通用书内容 |

---

## Nginx 反向代理

使用 Nginx 将 80 端口流量转发到 Frontend (3000)：

```bash
# 安装 Nginx
sudo apt install nginx -y

# 复制配置
sudo cp nginx.conf /etc/nginx/sites-available/bible

# 编辑域名
sudo nano /etc/nginx/sites-available/bible
# 将 your-domain.com 替换为你的域名或 IP

# 启用站点
sudo ln -s /etc/nginx/sites-available/bible /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default  # 删除默认站点

# 验证配置
sudo nginx -t

# 重载
sudo systemctl reload nginx
```

现在通过 `http://YOUR_SERVER_IP/` 即可访问应用。

---

## 防火墙配置

```bash
# Ubuntu (ufw)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# 云服务器安全组
# 在阿里云/腾讯云/AWS 控制台开放 80、443 端口
# ⚠️ 不要开放 8080-8086、3000 等内部端口！
```

---

## HTTPS 配置（推荐）

使用 Let's Encrypt 免费 SSL 证书：

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期（已自动配置）
sudo certbot renew --dry-run
```

---

## 数据备份与恢复

### 备份

所有数据存储在 `data/` 目录，备份整个目录即可：

```bash
# 创建备份
tar -czf bible-backup-$(date +%Y%m%d).tar.gz data/

# 远程备份
scp bible-backup-$(date +%Y%m%d).tar.gz user@backup-server:/backups/
```

**关键数据文件：**

| 文件 | 大小 | 内容 |
|------|------|------|
| `data/text-db.mv.db` | ~231MB | 经文 / 注释 / Strong's / 词典 |
| `data/auth-db.mv.db` | ~20KB | 用户账户 |
| `data/sword-mods/` | ~203MB | SWORD 模块文件 |
| `data/search-index/` | ~31MB | 全文搜索索引 |

### 恢复

```bash
# 停止服务
./stop.sh

# 恢复数据
tar -xzf bible-backup-YYYYMMDD.tar.gz

# 重启
./start.sh
```

### 定时备份（crontab）

```bash
# 每天凌晨 2 点备份
0 2 * * * cd /opt/bible-microservices && tar -czf /backups/bible-$(date +\%Y\%m\%d).tar.gz data/
```

---

## 日志管理

日志文件位于 `logs/` 目录：

```bash
# 查看所有日志
ls -lh logs/

# 实时跟踪
tail -f logs/text-service.log
tail -f logs/frontend.log

# 搜索错误
grep ERROR logs/*.log
grep Exception logs/*.log
```

日志轮转配置（防止日志无限增长）：

```bash
# 创建 logrotate 配置
sudo tee /etc/logrotate.d/bible-microservices << 'EOF'
/opt/bible-microservices/logs/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    copytruncate
}
EOF
```

---

## 故障排查

### 服务未启动

```bash
# 检查进程
ps aux | grep -E "(bible-|server.js)"

# 检查端口占用
netstat -tlnp | grep -E "3000|808[0-46]"

# 查看日志
tail -50 logs/text-service.log
tail -50 logs/frontend.log
```

### 端口被占用

```bash
# 查找占用进程
lsof -i :8081

# 强制释放
fuser -k 8081/tcp
```

### 内存不足

```bash
# 查看内存
free -h

# 减小 JVM 堆内存（编辑 start.sh）
JAVA_OPTS="-Xms128m -Xmx256m"  # 从 256/512 降低
```

### H2 数据库锁定

```bash
# H2 数据库被锁时，停止所有 Java 进程后重启
./stop.sh
sleep 3
./start.sh
```

### API 返回 502

Gateway 后端未就绪。等待 20 秒后重试，或检查后端日志。

---

## 自启动配置（推荐）

### Systemd 服务

创建 systemd 服务文件：

```bash
sudo tee /etc/systemd/system/bible-microservices.service << 'EOF'
[Unit]
Description=Bible Microservices
After=network.target

[Service]
Type=forking
WorkingDirectory=/opt/bible-microservices
ExecStart=/opt/bible-microservices/start.sh
ExecStop=/opt/bible-microservices/stop.sh
Restart=on-failure
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
EOF
```

启用自启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable bible-microservices
sudo systemctl start bible-microservices
sudo systemctl status bible-microservices
```

### 手动管理

```bash
# 启动
sudo systemctl start bible-microservices

# 停止
sudo systemctl stop bible-microservices

# 重启
sudo systemctl restart bible-microservices

# 状态
sudo systemctl status bible-microservices

# 查看日志
sudo journalctl -u bible-microservices -f
```

---

## 目录结构（部署后）

```
bible-microservices/
├── start.sh                 # 启动脚本
├── stop.sh                  # 停止脚本
├── nginx.conf               # Nginx 配置模板
├── DEPLOY.md                # 本文件
├── services/                # Java 微服务 JAR
│   ├── bible-gateway.jar
│   ├── bible-text-service.jar
│   ├── bible-search-service.jar
│   ├── bible-module-service.jar
│   ├── bible-auth-service.jar
│   └── bible-sword-service.jar
├── frontend/                # 前端静态文件
│   ├── server.js            # Node.js 静态服务 + API 代理
│   ├── index.html           # 主阅读器页面
│   ├── modules.html         # 模块管理页面
│   ├── admin.html           # 用户管理页面
│   ├── repos.json           # SWORD 模块仓库配置
│   ├── css/
│   ├── js/
│   └── components/
├── data/                    # 所有数据文件
│   ├── text-db.mv.db        # 主数据库（经文/注释/Strong's/词典）
│   ├── auth-db.mv.db        # 用户认证数据库
│   ├── bible-module.mv.db   # 模块管理数据库
│   ├── sword-mods/          # SWORD 模块文件
│   └── search-index/        # 全文搜索索引
└── logs/                    # 运行日志
```

---

## 默认管理员账户

| 用户名 | 密码 | 角色 |
|--------|------|------|
| `admin` | `admin123` | ADMIN |

> ⚠️ **首次部署后请立即修改管理员密码！**  
> 登录后通过"用户管理"页面（admin.html）修改。

---

## 可选的 SWORD 模块仓库

系统内置 4 个默认仓库 + 1 个可自定义仓库：

| 仓库 ID | 名称 | URL |
|---------|------|-----|
| `crosswire` | CrossWire 主仓 | https://crosswire.org/ftpmirror/pub/sword |
| `crosswire-beta` | CrossWire Beta | https://crosswire.org/ftpmirror/pub/sword/beta |
| `crosswire-av11n` | CrossWire Av11n | https://crosswire.org/ftpmirror/pub/sword/av11n |
| `xmission` | XMission | https://www.xmission.com/pub/sword |
| `custom-0` | Xiphos | ftp://ftp.xiphos.org/pub/xiphos |

管理方式：登入 admin 账户 → 点击 📦 模块管理 → 仓库管理。

---

## 资源估算

| 组件 | 磁盘 | 内存（空载） | 内存（负载） |
|------|------|-------------|-------------|
| Text Service | 54MB | ~150MB | ~300MB |
| Search Service | 37MB | ~100MB | ~250MB |
| Module Service | 55MB | ~120MB | ~200MB |
| Auth Service | 57MB | ~100MB | ~150MB |
| Sword Service | 30MB | ~200MB | ~400MB |
| Gateway | 40MB | ~80MB | ~150MB |
| Frontend (Node) | <1MB | ~30MB | ~50MB |
| **数据文件** | ~470MB | — | — |
| **合计** | ~740MB | ~880MB | ~1.5GB |

> 推荐：4GB 内存云服务器可稳定运行。
