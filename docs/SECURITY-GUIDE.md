# Bible Monolith — 安全配置指南

> 版本：v2.0 | 更新日期：2026-07-23

---

## 1. 安全架构概述

### 1.1 三环境配置体系

| 环境 | Profile | 配置文件 | 密码存储 | 是否提交代码库 |
|------|---------|----------|----------|----------------|
| 开发 | dev | `application.yml` | 明文 | ✅ 是 |
| 测试 | uat | `application-uat.yml` | BCrypt | ❌ 否（.gitignore 排除） |
| 生产 | prod | `application-prod.yml` | BCrypt | ❌ 否（.gitignore 排除） |

### 1.2 启动方式

```bash
java -jar bible-monolith.jar                              # dev（默认）
java -jar bible-monolith.jar --spring.profiles.active=uat  # uat
java -jar bible-monolith.jar --spring.profiles.active=prod # prod
```

### 1.3 安全差异对照

| 配置项 | dev | uat | prod |
|--------|-----|-----|------|
| 密码存储 | 明文 | BCrypt | BCrypt |
| H2 控制台 | 开启 | 关闭 | 关闭 |
| JWT 有效期 | 24h | 8h | 2h |
| 日志级别 | DEBUG | INFO | WARN |
| Actuator 暴露 | health,info,metrics,caches | health,info | 仅 health |
| 上传限制 | 100MB | 50MB | 10MB |
| 敏感值来源 | 硬编码默认值 | 环境变量（必填） | 环境变量（必填） |

---

## 2. 环境变量

### 2.1 变量清单

uat/prod 环境必须设置以下环境变量，无默认值，未设置将启动失败：

| 变量名 | 用途 | 生成方式 |
|--------|------|----------|
| `JWT_SECRET` | JWT 签名密钥 | `openssl rand -base64 64` |
| `H2_PASSWORD` | H2 数据库密码 | `openssl rand -base64 32` |
| `ADMIN_PASSWORD` | 管理员密码 | `openssl rand -base64 12` |
| `PRINCIPAL_PASSWORD` | 校长密码 | `openssl rand -base64 12` |

可选变量：

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `ADMIN_USERNAME` | admin | 管理员用户名 |
| `PRINCIPAL_USERNAME` | principal | 校长用户名 |

### 2.2 Linux 环境变量设置

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

# 3. 设置文件权限
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
# 1. 创建密钥文件（同上）

# 2. 创建 systemd 服务
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

# 3. 创建环境变量文件
sudo tee /etc/bible/secrets/env << 'EOF'
JWT_SECRET=这里粘贴生成的密钥
H2_PASSWORD=这里粘贴生成的密码
ADMIN_PASSWORD=这里粘贴生成的密码
PRINCIPAL_PASSWORD=这里粘贴生成的密码
EOF
sudo chmod 600 /etc/bible/secrets/env

# 4. 启动
sudo systemctl daemon-reload
sudo systemctl enable bible-monolith
sudo systemctl start bible-monolith
```

**方式三：临时 export（测试用）**

```bash
export JWT_SECRET=$(openssl rand -base64 64)
export H2_PASSWORD=$(openssl rand -base64 32)
export ADMIN_PASSWORD=$(openssl rand -base64 12)
export PRINCIPAL_PASSWORD=$(openssl rand -base64 12)

java -jar bible-monolith.jar --spring.profiles.active=prod
```

### 2.3 Windows 环境变量设置

**方式一：PowerShell 临时变量**

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

# 启动
java -jar bible-monolith.jar --spring.profiles.active=prod
```

**方式二：密钥文件 + 启动脚本**

```powershell
# 1. 创建密钥目录
$secretDir = "C:\secrets\bible"
New-Item -ItemType Directory -Path $secretDir -Force

# 2. 生成密钥文件
function New-Secret($bytes) {
    $b = [byte[]]::new($bytes)
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

Set-Location "D:\dev\github\bible-microservices"
java -Dfile.encoding=UTF-8 -Xms128m -Xmx1g `
  -jar bible-monolith\build\libs\bible-monolith.jar `
  --spring.profiles.active=prod
'@
$startScript | Out-File -Encoding utf8 "D:\dev\github\bible-microservices\start-prod.ps1"

# 4. 启动
.\start-prod.ps1
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

---

## 3. 密码安全（BCrypt）

### 3.1 BCrypt 机制

`PasswordService.kt` 根据 `app.bcrypt-enabled` 配置自动切换：

- **`false`（dev）**：`hash()` 返回明文，`matches()` 明文比较
- **`true`（uat/prod）**：`hash()` 返回 BCrypt 哈希（strength=10），`matches()` 自动检测 `$2a$` 前缀

### 3.2 密码自动升级

用户在 uat/prod 环境登录时，如果密码仍是明文（从 dev 迁移过来），系统验证成功后自动升级为 BCrypt 哈希，无需手动迁移。

```kotlin
// AuthService.kt 登录逻辑
if (passwordService.needsUpgrade(user.passwordHash)) {
    val upgraded = passwordService.hash(password)
    userRepository.save(user.copy(passwordHash = upgraded))
    log.info("Upgraded password hash for user {}", user.username)
}
```

---

## 4. H2 控制台安全

### 4.1 配置

| 环境 | H2 控制台 | 路径 |
|------|-----------|------|
| dev | 开启 | `http://localhost:8080/h2-console` |
| uat/prod | 关闭 | — |

### 4.2 nginx 层拦截（生产环境额外保护）

```nginx
location /h2-console {
    deny all;
    return 403;
}
```

---

## 5. Actuator 端点安全

| 环境 | 暴露端点 | base-path | 详情显示 |
|------|----------|-----------|----------|
| dev | health,info,metrics,caches | /actuator | when-authorized |
| uat | health,info | /actuator | when-authorized |
| prod | 仅 health | /internal | never |

### nginx 层拦截（生产环境）

```nginx
location /actuator {
    deny all;
    return 403;
}

location /internal/ {
    allow 127.0.0.1;
    deny all;
    proxy_pass http://localhost:8080;
}
```

---

## 6. HTTPS 配置

### 6.1 Let's Encrypt 免费证书（推荐）

```bash
# 安装 certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书（替换为你的域名）
sudo certbot --nginx -d bible.yourdomain.com

# 自动续期
sudo certbot renew --dry-run
```

### 6.2 nginx HTTPS 配置

```nginx
server {
    listen 80;
    server_name bible.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name bible.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/bible.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bible.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # 安全头
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;

    server_tokens off;
    client_max_body_size 10M;

    # 速率限制
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    location /api/v1/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://localhost:8080;
    }

    location /api/v1/auth/register {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://localhost:8080;
    }

    location /h2-console { deny all; return 403; }
    location /actuator { deny all; return 403; }

    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://localhost:3000;
    }
}
```

---

## 7. 首次部署安全清单

### 密钥生成

- [ ] 创建密钥目录（权限 700）
- [ ] 生成 JWT_SECRET（64 bytes base64）
- [ ] 生成 H2_PASSWORD（32 bytes base64）
- [ ] 生成 ADMIN_PASSWORD（12 bytes base64）
- [ ] 生成 PRINCIPAL_PASSWORD（12 bytes base64）
- [ ] 密钥文件权限 600
- [ ] 密钥文件已保存到密码管理器

### 配置文件

- [ ] `application-uat.yml` 已放置到服务器 JAR 同目录
- [ ] `application-prod.yml` 已放置到服务器 JAR 同目录
- [ ] 两个文件不在代码库中（.gitignore 已排除）

### 网络安全

- [ ] H2 控制台在 uat/prod 已关闭
- [ ] Actuator 在 prod 仅 health + base-path 改为 /internal
- [ ] nginx 拦截 /h2-console 和 /actuator
- [ ] HTTPS 证书已配置
- [ ] 登录速率限制已配置
- [ ] server_tokens off

### 验证

```bash
# 验证 H2 控制台被拦截
curl -s -o /dev/null -w "%{http_code}" https://your-domain/h2-console
# 预期：403

# 验证 Actuator 被拦截
curl -s -o /dev/null -w "%{http_code}" https://your-domain/actuator/metrics
# 预期：403

# 验证 HTTPS
curl -sI https://your-domain/ | grep -i strict-transport
```

---

## 8. 密钥轮换

| 密钥 | 建议周期 | 轮换影响 |
|------|----------|----------|
| JWT_SECRET | 每季度 | 所有用户需重新登录 |
| H2_PASSWORD | 每季度 | 需重建数据库 |
| ADMIN_PASSWORD | 每月 | 仅影响管理员登录 |
| HTTPS 证书 | 每 90 天 | certbot 自动续期 |

---

*本文档最后更新：2026-07-23*
