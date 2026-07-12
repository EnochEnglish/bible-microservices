# 部署说明文档 — Bible Microservices

## 1. 部署架构

```
互联网 → nginx (80/443) → ┌── /bible/ → 前端静态文件 (/var/www/html/bible/)
                           ├── /api/   → 反向代理 → localhost:8080
                           └── /       → 旧站 (wheatTeam)
                                                    ↑
                           后端 (bible-monolith.jar, 端口 8080)
                           ├── H2 数据库 (data/text-db.mv.db, 231MB)
                           └── SWORD 模块 (data/sword-mods/, ~410MB)
```

## 2. 服务器要求

| 项目 | 最低 | 推荐 |
|------|------|------|
| CPU | 1 核 | 2 核 |
| 内存 | 1 GB | 2 GB |
| 磁盘 | 2 GB | 5 GB |
| OS | Ubuntu 20.04+ / CentOS 8+ | Ubuntu 22.04 |
| JDK | 17 | 17 |
| Node.js | 16 | 18+ |

## 3. 本地开发部署

### 3.1 环境准备

```bash
# 安装 JDK 17
# Windows: scoop install openjdk17
# Linux: sudo apt install openjdk-17-jdk

# 安装 Node.js 16+
# Windows: scoop install nodejs
# Linux: sudo apt install nodejs npm

# 验证
java -version    # 应显示 17.x
node -v          # 应显示 v16+
```

### 3.2 编译后端

```bash
cd bible-monolith

# Windows
.\gradlew.bat bootJar -x test --no-daemon

# Linux
./gradlew bootJar -x test --no-daemon

# 产物: build/libs/bible-monolith.jar (~75MB)
```

### 3.3 启动后端

```bash
# 重要：CWD 必须是项目根目录（H2 相对路径从 CWD 解析）
cd bible-microservices

java -Dfile.encoding=UTF-8 -Xms48m -Xmx256m \
  -jar bible-monolith/build/libs/bible-monolith.jar \
  --sword.modules-path=./data/sword-mods
```

**⚠️ H2 路径陷阱**：`jdbc:h2:file:./data/text-db` 从进程 CWD 解析，非 JAR 所在目录。从错误目录启动会连到空库（4KB），返回 0 条译本。

### 3.4 启动前端

```bash
cd frontend
node server.js
# 端口 3000
```

### 3.5 验证

```bash
# 后端
curl http://localhost:8080/api/v1/bible/translations
# 应返回 22+ 译本

# 前端
curl http://localhost:3000/
# 应返回 HTML 页面
```

## 4. 服务器部署

### 4.1 上传文件

需要上传的文件：
1. `bible-monolith.jar`（75MB）— 后端 JAR
2. `frontend/` 目录 — 前端静态文件
3. `data/sword-mods/` — SWORD 模块（首次部署）

**不需要上传**：
- H2 数据库（首次运行自动创建，或单独上传）
- `build/` 目录
- `node_modules/`
- 临时脚本

### 4.2 服务器目录结构

```
/opt/bible-microservices/
├── bible-monolith.jar          # 后端 JAR
├── data/
│   ├── text-db.mv.db           # H2 数据库 (231MB)
│   ├── auth-db.mv.db           # 认证数据库
│   └── sword-mods/             # SWORD 模块 (~410MB)
├── frontend/                   # 前端静态文件
│   ├── index.html
│   ├── m/                      # 手机版
│   ├── js/
│   ├── css/
│   ├── library-data/
│   └── server.js
└── start.sh                    # 启动脚本
```

### 4.3 启动脚本

```bash
#!/bin/bash
# /opt/bible-microservices/start.sh

cd /opt/bible-microservices

# 启动后端
nohup java -Dfile.encoding=UTF-8 -Xms48m -Xmx256m \
  -jar bible-monolith.jar \
  --sword.modules-path=./data/sword-mods \
  > /var/log/bible-monolith.log 2>&1 &

echo "Backend PID: $!"

# 启动前端
cd frontend
nohup node server.js > /var/log/bible-frontend.log 2>&1 &

echo "Frontend PID: $!"
```

### 4.4 nginx 配置

```nginx
# /etc/nginx/sites-enabled/default

# 前端静态文件
server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location /bible/ {
        alias /opt/bible-microservices/frontend/;
        index index.html;
        try_files $uri $uri/ /bible/index.html;
    }

    # API 反向代理
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 旧站
    location / {
        root /var/www/html;
        index index.html;
    }
}
```

### 4.5 部署步骤

```bash
# 1. 停止旧服务
pkill -f bible-monolith || true
pkill -f "node server.js" || true

# 2. 备份
cp /opt/bible-microservices/bible-monolith.jar /opt/bible-microservices/bible-monolith.jar.bak

# 3. 替换 JAR
cp deploy-package/bible-monolith.jar /opt/bible-microservices/

# 4. 替换前端
cp -r deploy-package/frontend/* /opt/bible-microservices/frontend/

# 5. 启动
cd /opt/bible-microservices
bash start.sh

# 6. 验证
sleep 20
curl http://localhost:8080/api/v1/bible/translations
curl http://localhost:3000/

# 7. 重启 nginx
nginx -t && systemctl restart nginx
```

## 5. 更新部署

只需更新两个部分：
1. `bible-monolith.jar` — 后端代码
2. `frontend/` 目录 — 前端文件

**不需要更新**（除非数据结构变更）：
- H2 数据库
- SWORD 模块
- application.yml

```bash
# 快速更新
pkill -f bible-monolith
cp new-jar/bible-monolith.jar /opt/bible-microservices/
cp -r new-frontend/* /opt/bible-microservices/frontend/
cd /opt/bible-microservices && bash start.sh
```

## 6. SSL/HTTPS 配置

```bash
# 使用 Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 7. 监控

```bash
# 查看后端日志
tail -f /var/log/bible-monolith.log

# 查看前端日志
tail -f /var/log/bible-frontend.log

# 检查进程
ps aux | grep bible-monolith
ps aux | grep "node server.js"

# 检查端口
ss -tlnp | grep 8080
ss -tlnp | grep 3000

# 内存使用
free -h
```

## 8. 故障排查

| 症状 | 可能原因 | 解决方案 |
|------|----------|----------|
| 译本返回 0 条 | H2 路径错误 | 确认 CWD 是项目根目录 |
| 前端白屏 | index.html 编码损坏 | 从 git 恢复 |
| API 404 | JAR 版本过旧 | 重新编译部署 |
| SWORD 模块 0 个 | 路径大小写问题 | Linux 上创建符号链接 |
| 内存不足 | JVM OOM | 增加 -Xmx 或添加 swap |
| 端口被占用 | 旧进程未退出 | `pkill -f bible-monolith` |

## 9. 备份

```bash
# 备份数据库
cp /opt/bible-microservices/data/text-db.mv.db /backup/text-db-$(date +%Y%m%d).mv.db

# 备份 SWORD 模块（首次后无需重复）
tar -czf /backup/sword-mods.tar.gz /opt/bible-microservices/data/sword-mods/
```
