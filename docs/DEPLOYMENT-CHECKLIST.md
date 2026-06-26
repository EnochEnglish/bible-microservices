# 部署清单

**Last updated**: 2026-06-27 | **Server**: 8.222.165.245 (Shenzhen ECS)

---

## 服务器信息

| 项目 | 值 |
|------|-----|
| IP | 8.222.165.245 |
| 部署路径 | `/opt/bible-microservices/` |
| FTP 用户 | ccscw |
| OS | Ubuntu (Aliyun ECS) |
| JDK | OpenJDK 17 |
| 内存 | 1 GiB |

---

## 部署文件清单

### 后端（单 JAR）

| 文件 | 本地路径 | 服务器路径 | 说明 |
|------|---------|-----------|------|
| `bible-monolith.jar` | `bible-monolith/build/libs/bible-monolith.jar` (~75MB) | `/opt/bible-microservices/bible-monolith.jar` | 单体应用，含所有后端代码 |

> **⚠️ 注意**: 本地有 3 个 JAR 副本，只有 `build/libs/` 是最新版：
> - `bible-monolith/build/libs/bible-monolith.jar` — ✅ 最新（含读经计划）
> - `cloud-deploy-v2/bible-monolith.jar` — ❌ 旧版
> - `deploy-package/bible-monolith.jar` — ❌ 旧版

### 前端文件

| 文件 | 本地路径 | 服务器路径 | 说明 |
|------|---------|-----------|------|
| `index.html` | `frontend/index.html` | `/opt/bible-microservices/frontend/index.html` | 桌面版入口 |
| `style.css` | `frontend/css/style.css` | `/opt/bible-microservices/frontend/css/style.css` | 桌面版样式 |
| `app.js` | `frontend/js/app.js` | `/opt/bible-microservices/frontend/js/app.js` | 桌面版逻辑 |
| `api.js` | `frontend/js/api.js` | `/opt/bible-microservices/frontend/js/api.js` | API 封装 |
| `config.js` | `frontend/js/config.js` | `/opt/bible-microservices/frontend/js/config.js` | 配置（basePath 自动检测） |
| `morphology.js` | `frontend/js/morphology.js` | `/opt/bible-microservices/frontend/js/morphology.js` | 形态码解析（406+ codes） |
| `server.js` | `frontend/server.js` | `/opt/bible-microservices/frontend/server.js` | Node.js 静态服务 + API 代理 |
| `modules.html` | `frontend/modules.html` | `/opt/bible-microservices/frontend/modules.html` | 模块管理页 |
| `admin.html` | `frontend/admin.html` | `/opt/bible-microservices/frontend/admin.html` | 管理面板 |
| `m/index.html` | `frontend/m/index.html` | `/opt/bible-microservices/frontend/m/index.html` | 手机版入口 |
| `m/mobile.js` | `frontend/m/mobile.js` | `/opt/bible-microservices/frontend/m/mobile.js` | 手机版逻辑 |
| `m/mobile.css` | `frontend/m/mobile.css` | `/opt/bible-microservices/frontend/m/mobile.css` | 手机版样式 |
| `m/manifest.json` | `frontend/m/manifest.json` | `/opt/bible-microservices/frontend/m/manifest.json` | PWA manifest |
| `m/icon.svg` | `frontend/m/icon.svg` | `/opt/bible-microservices/frontend/m/icon.svg` | PWA 图标 |

### 数据文件（无需每次上传）

| 文件 | 大小 | 说明 |
|------|------|------|
| `data/text-db.mv.db` | ~231 MB | H2 数据库（13 译本 + 词典 + 注释 + Strong's） |
| `data/auth-db.mv.db` | ~24 KB | 认证数据库 |
| `data/bible-module.mv.db` | ~20 KB | 模块元数据 |
| `data/sword-mods/` | ~500 MB | 25+ SWORD 模块 |
| `data/sword-dicts/` | ~10 MB | Strong's JSON 词典 |

> 数据库首次部署后不需要更新，除非有新译本/词典导入。

---

## 后端部署步骤

```bash
# 1. 停止旧进程
pkill -f bible-monolith.jar
sleep 2

# 2. 备份旧 JAR
cd /opt/bible-microservices
mv bible-monolith.jar bible-monolith.bak.jar

# 3. 复制新 JAR（从 FTP 上传目录）
cp /var/www/html/deploy-package/bible-monolith.jar /opt/bible-microservices/

# 4. 启动新进程（⚠️ 必须从项目根目录启动，H2 相对路径依赖 CWD）
cd /opt/bible-microservices
nohup java -Xms48m -Xmx160m -XX:+UseG1GC \
  -Dsword.modules-path=./data/sword-mods \
  -jar bible-monolith.jar \
  > monolith.log 2>&1 &

# 5. 等待启动（Spring Boot 需 15-25 秒）
sleep 20

# 6. 验证
curl -s http://localhost:8080/api/v1/bible/translations | head -c 200
echo ""
curl -s http://localhost:8080/api/v1/sword/modules | head -c 200
echo ""
curl -s http://localhost:8080/api/v1/reading-plans | head -c 200
echo ""
```

### 验证标准

| 端点 | 期望结果 |
|------|---------|
| `/api/v1/bible/translations` | JSON 数组，22+ 译本 |
| `/api/v1/sword/modules` | JSON 数组，29 模块 |
| `/api/v1/reading-plans` | JSON 数组，3 个计划 |

---

## 前端部署步骤

```bash
# 前端文件复制到 nginx 目录（根据实际 nginx 配置调整）
cp /var/www/html/deploy-package/frontend/* /opt/bible-microservices/frontend/ -r

# 或者如果 nginx alias 指向 /opt/bible-microservices/frontend/
# 则直接在原地更新

# 重启前端服务（如果用 pm2）
pm2 restart bible-frontend

# 或如果用 nohup
pkill -f "node server.js"
cd /opt/bible-microservices/frontend
nohup node server.js > frontend.log 2>&1 &
```

---

## nginx 配置

```nginx
server {
    listen 80;
    server_name usebible.com;

    # 旧站（wheatTeam）
    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Bible 前端
    location /bible/ {
        alias /opt/bible-microservices/frontend/;
        try_files $uri $uri/ /bible/index.html;
    }

    # API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## Linux 特殊处理

### BibleAtlas/BibleMap 大小写敏感

Linux 文件系统区分大小写，JSword 的 GenBookService 匹配模块名时可能失败。

```bash
cd /opt/bible-microservices/data/sword-mods
ln -s BibleAtlas bibleatlas
ln -s BibleMap biblemap
```

### Swap 配置（1GB VPS 推荐）

```bash
sudo fallocate -l 512M /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
sudo sysctl vm.swappiness=10
```

---

## 版本历史

| 版本 | 日期 | JAR 构建时间 | 主要变更 |
|------|------|-------------|---------|
| v9 | 2026-06-25 | 6/26 02:06 | 读经计划 + Interlinear 7 译本 + OSIS 映射修复 + basePath |
| v8 | 2026-06-22 | 6/19 10:25 | 服务器部署 + nginx + 22 译本 + Strong's 修复 |
| v7 | 2026-06-20 | 6/19 10:25 | 6 微服务合并为单体 + 5 轮 Bug 修复 |

---

## 当前部署版本 (2026-06-27)

- **JAR**: `bible-monolith.jar` (75.3MB, 6/26 02:06 构建)
- **前端版本号**: v=20260627a
- **Git 分支**: `monolith-clean`
- **Git 最新 commit**: `c5b12a8`
- **数据库**: H2 text-db.mv.db (231MB, 不需更新)
- **读经计划**: 3 个计划（M'Cheyne 365天 / NT 90天 / Proverbs 30天）
