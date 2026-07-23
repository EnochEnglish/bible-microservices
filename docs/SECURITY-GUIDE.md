# Bible Microservices — 生产环境安全配置指南

> 版本：v1.0 | 更新日期：2026-07-23

---

## 目录

1. [安全风险总览](#1-安全风险总览)
2. [数据库安全](#2-数据库安全)
3. [JWT 密钥安全](#3-jwt-密钥安全)
4. [管理员账户安全](#4-管理员账户安全)
5. [H2 控制台安全](#5-h2-控制台安全)
6. [Actuator 端点安全](#6-actuator-端点安全)
7. [HTTPS 配置](#7-https-配置)
8. [密码存储方案](#8-密码存储方案)
9. [前端安全](#9-前端安全)
10. [nginx 安全加固](#10-nginx-安全加固)
11. [应用层安全配置](#11-应用层安全配置)
12. [安全配置总表](#12-安全配置总表)
13. [安全部署检查清单](#13-安全部署检查清单)

---

## 1. 安全风险总览

### 1.1 当前安全风险

| 风险等级 | 问题 | 所在位置 | 影响 |
|----------|------|----------|------|
| 🔴 严重 | 密码明文存储 | `AuthService.kt` | 数据库泄露=所有密码泄露 |
| 🔴 严重 | JWT secret 硬编码 | `application.yml` | 可伪造任意 token |
| 🔴 严重 | 管理员密码硬编码 | `application.yml` | 默认密码可被猜解 |
| 🟠 高危 | H2 控制台开放 | `application.yml` | 可直连数据库增删改 |
| 🟠 高危 | 密码无 BCrypt 哈希 | `AuthService.kt` | 密码以明文传输和存储 |
| 🟠 高危 | Actuator 无保护 | `application.yml` | 泄露系统信息 |
| 🟡 中危 | 无 HTTPS | nginx | 流量明文传输 |
| 🟡 中危 | H2 密码为空 | `application.yml` | 直连无需认证 |
| 🟡 中危 | 校长账户密码硬编码 | `DataInitializer.kt` | 泄露预设密码 |
| 🟢 低危 | 验证码签名密钥 | 代码内置 | 可被逆向得到 |
| 🟢 低危 | 日志输出级别 DEBUG | `application.yml` | 生产环境日志过多 |

### 1.2 修复优先级

| 优先级 | 修复项 | 难度 |
|--------|--------|------|
| **P0** | JWT secret 改为环境变量 | 低 |
| **P0** | 管理员密码改为环境变量 | 低 |
| **P0** | 关闭 H2 控制台 | 低 |
| **P0** | 密码加 BCrypt 哈希 | 中 |
| **P1** | H2 数据库设置密码 | 低 |
| **P1** | Actuator 端点限制 | 低 |
| **P1** | HTTPS 证书 | 中 |
| **P2** | 日志级别调整 | 低 |

---

## 2. 数据库安全

### 2.1 设置 H2 数据库密码

**当前状态**：`username: sa, password:`（空密码）

**修复步骤**：

打开 `bible-monolith/src/main/resources/application.yml`，修改 datasource 配置：

```yaml
spring:
  datasource:
    url: jdbc:h2:file:./data/text-db;DB_CLOSE_ON_EXIT=FALSE;MODE=MySQL
    username: sa
    password: ${H2_PASSWORD:}          # ← 从环境变量读取

# 同时将 spring.datasource.url 加上 PASSWORD 参数
# 注意：H2 文件模式的密码在首次连接时设定，之后不能更改
# 如果已有数据库无密码，需先备份后删除重建
#
# url: jdbc:h2:file:./data/text-db;DB_CLOSE_ON_EXIT=FALSE;MODE=MySQL;PASSWORD=your_secure_password
```

**⚠️ H2 密码重要说明**：
- H2 文件模式密码在 **首次连接时设定**，之后无法修改
- 如果旧数据库没有密码，你无法直接加密码
- 正确做法：设密码 → 删旧库 → 重启 → 重新导入数据

**生产环境推荐方案**——使用环境变量：

```bash
# Linux 启动
export H2_PASSWORD=$(openssl rand -base64 16)
java -DH2_PASSWORD=$H2_PASSWORD -jar bible-monolith.jar

# Windows PowerShell
$env:H2_PASSWORD = [Convert]::ToBase64String([byte[]]::new(16) | ForEach-Object { $_ = 0..255 | Get-Random })
java -DH2_PASSWORD=$env:H2_PASSWORD -jar bible-monolith.jar
```

### 2.2 设置密码后首次部署流程

```bash
# 1. 备份旧库
cp data/text-db.mv.db data/text-db.mv.db.bak

# 2. 删旧库
rm data/text-db.mv.db
rm data/text-db.mv.db.lock.db
rm data/text-db.mv.db.trace.db

# 3. 设置新密码
export H2_PASSWORD="aHR0cHM6Ly9naXRodWIuY29tL0Vub2NoRW5nbGlzaA=="

# 4. 修改 application.yml
#    url 追加 ;PASSWORD=${H2_PASSWORD}
#    password: ${H2_PASSWORD}

# 5. 启动（自动重建数据库）
java -DH2_PASSWORD=$H2_PASSWORD -jar bible-monolith.jar
```

---

## 3. JWT 密钥安全

### 3.1 当前状态

```yaml
jwt:
  secret: bWljcm9zZXJ2aWNlcy1iaWJsZS1hdXRoLWp3dC1zZWNyZXQta2V5LTIwMjYtMDYtMTQ=
```

这是 Base64 编码的 `"microservices-bible-auth-jwt-secret-key-2026-06-14"`，硬编码在配置文件中，任何人都可以解码并伪造 JWT token。

### 3.2 修复方案

**步骤 1：生成新密钥**

```bash
# Linux
openssl rand -base64 64 > jwt-secret.txt

# Windows PowerShell
$bytes = [byte[]]::new(64)
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes) | Out-File -Encoding ascii jwt-secret.txt
```

**步骤 2：修改 application.yml**

```yaml
jwt:
  secret: ${JWT_SECRET}              # 从环境变量读取
  expiration-ms: 86400000            # 24h（生产环境建议 2-4h）
```

**步骤 3：启动时传入环境变量**

```bash
# Linux
export JWT_SECRET=$(cat jwt-secret.txt)
java -DJWT_SECRET=$JWT_SECRET -jar bible-monolith.jar

# Windows PowerShell
$env:JWT_SECRET = "这里粘贴 jwt-secret.txt 的内容"
java -DJWT_SECRET=$env:JWT_SECRET -jar bible-monolith.jar
```

### 3.3 Token 有效期建议

| 环境 | expiration-ms | 说明 |
|------|---------------|------|
| 开发 | 86400000 (24h) | 方便调试 |
| 生产 | 7200000 (2h) | 降低泄露风险 |
| 生产（高安全） | 1800000 (30min) | 需配合 refresh token |

---

## 4. 管理员账户安全

### 4.1 当前状态

```yaml
app:
  admin:
    username: admin
    password: admin123  # Should be changed on first login
```

`admin123` 硬编码在配置文件中，安全性极低。

### 4.2 修复方案

**步骤 1：修改 application.yml**

```yaml
app:
  admin:
    username: ${ADMIN_USERNAME:admin}            # 可配置用户名
    password: ${ADMIN_PASSWORD:}                  # 必须从环境变量读取
```

**步骤 2：启动时传入强密码**

```bash
# Linux 生成随机密码
export ADMIN_PASSWORD=$(openssl rand -base64 12)   # 如 "f8X2pK9mL3qR"
echo "Admin password: $ADMIN_PASSWORD"              # 保存到密码管理器
java -DADMIN_PASSWORD=$ADMIN_PASSWORD -jar bible-monolith.jar

# Windows PowerShell
$bytes = [byte[]]::new(12)
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$env:ADMIN_PASSWORD = [Convert]::ToBase64String($bytes)
java "-DADMIN_PASSWORD=$env:ADMIN_PASSWORD" -jar bible-monolith.jar
```

### 4.3 其他预设账户

`DataInitializer.kt` 中还预设了校长账户密码 `principal123`：

```kotlin
// DataInitializer.kt 第56行
passwordHash = "principal123",
```

**修复方案**——也改为从配置读取：

```yaml
app:
  admin:
    username: ${ADMIN_USERNAME:admin}
    password: ${ADMIN_PASSWORD:}
  principal:
    username: ${PRINCIPAL_USERNAME:principal}
    password: ${PRINCIPAL_PASSWORD:}
```

---

## 5. H2 控制台安全

### 5.1 当前状态

```yaml
spring:
  h2:
    console:
      enabled: true       # 生产环境应关闭
      path: /h2-console   # 可访问路径
```

H2 控制台允许浏览器直接管理数据库，无需任何认证。

### 5.2 生产环境方案

**方案 A：完全关闭（推荐）**

```yaml
spring:
  h2:
    console:
      enabled: false
```

**方案 B：保留但加保护（仅调试需要）**

```yaml
spring:
  h2:
    console:
      enabled: true
      path: /h2-console-${random.uuid}  # 随机路径，防止扫描
```

### 5.3 nginx 层拦截

```nginx
# 拒绝外部访问 H2 控制台
location /h2-console {
    deny all;
    return 403;
}
```

---

## 6. Actuator 端点安全

### 6.1 当前状态

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,caches
```

`health` 和 `metrics` 端点可能泄露系统信息、内存使用等。

### 6.2 生产环境配置

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health      # 只保留健康检查
      base-path: /internal   # 改为非标准路径
  endpoint:
    health:
      show-details: never    # 不显示详细状态
      show-components: never
      show-disk: false       # 不显示磁盘信息
```

### 6.3 nginx 层限制

```nginx
# Actuator 仅限内网访问
location /internal/ {
    allow 127.0.0.1;
    allow 10.0.0.0/8;        # 内网网段
    deny all;
    proxy_pass http://localhost:8080;
}

# 或直接拒绝外网访问
location /actuator/ {
    deny all;
    return 403;
}
```

---

## 7. HTTPS 配置

### 7.1 使用 Let's Encrypt 免费证书

```bash
# 1. 安装 certbot
apt install certbot python3-certbot-nginx

# 2. 获取证书（替换为你的域名）
certbot --nginx -d bible.yourdomain.com

# 3. 证书自动续期
certbot renew --dry-run
```

### 7.2 nginx HTTPS 配置

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

    # 安全协议配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000" always;

    # HTTPS 代理升级
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 7.3 无域名方案（自签名证书）

```bash
# 生成自签名证书
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/bible-selfsigned.key \
  -out /etc/ssl/certs/bible-selfsigned.crt \
  -subj "/C=CN/ST=Shanghai/L=Shanghai/O=Bible/CN=localhost"
```

然后在 nginx 中引用上述证书路径。

---

## 8. 密码存储方案

### 8.1 当前风险

当前 `AuthService.kt` 中密码以**明文**存储和比较：

```kotlin
// 注册：直接存明文
userRepository.save(User(
    passwordHash = password,   // 明文！
    ...
))

// 登录：直接比较明文
if (user.passwordHash != password) {  // 明文比较！
    return AuthResponse(success = false, message = "用户名或密码错误")
}
```

这意味着如果数据库泄露，所有用户的密码将完全暴露。

### 8.2 修复方案——使用 BCrypt

**步骤 1：添加依赖**

`build.gradle.kts`：

```kotlin
// Spring Security Crypto (含 BCrypt)
implementation("org.springframework.security:spring-security-crypto")
```

**步骤 2：创建密码服务**

新建 `bible-monolith/src/main/kotlin/com/bible/monolith/security/PasswordService.kt`：

```kotlin
package com.bible.monolith.security

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service

/**
 * 密码安全服务 —— 使用 BCrypt 进行密码哈希和验证
 *
 * BCrypt 特性：
 * - 自动加盐：每个密码存储时带随机盐值
 * - 可调节强度：strength=10（2^10=1024 轮迭代）
 * - 抗彩虹表：内置 salt
 * - 输出自带版本标识：$2a$10$...
 */
@Service
class PasswordService {
    private val encoder = BCryptPasswordEncoder(10)  // strength=10

    /**
     * 对明文密码进行 BCrypt 哈希
     */
    fun hash(plainPassword: String): String {
        return encoder.encode(plainPassword)
    }

    /**
     * 验证明文密码是否匹配已存储的哈希值
     */
    fun matches(plainPassword: String, hashedPassword: String): Boolean {
        return encoder.matches(plainPassword, hashedPassword)
    }
}
```

**步骤 3：修改 AuthService.kt**

```kotlin
// 注入 PasswordService
class AuthService(
    private val userRepository: UserRepository,
    private val jwtUtil: JwtUtil,
    private val captchaController: CaptchaController,
    private val passwordService: PasswordService   // 新增注入
) {
    // 注册：使用 BCrypt 哈希
    fun register(username: String, password: String, captchaToken: String?, captchaAnswer: Int): AuthResponse {
        // ...验证码校验...
        val user = userRepository.save(User(
            username = username,
            passwordHash = passwordService.hash(password),   // ✅ BCrypt 哈希
            role = Role.USER
        ))
        val token = jwtUtil.generateToken(user.id, user.username, user.role.name)
        return AuthResponse(success = true, token = token, user = user.toInfo())
    }

    // 登录：使用 BCrypt 验证
    fun login(username: String, password: String): AuthResponse {
        val user = userRepository.findByUsername(username)
            ?: return AuthResponse(success = false, message = "用户名或密码错误")
        if (!user.enabled) {
            return AuthResponse(success = false, message = "账户已被禁用，请联系管理员")
        }
        if (!passwordService.matches(password, user.passwordHash)) {  // ✅ BCrypt 验证
            return AuthResponse(success = false, message = "用户名或密码错误")
        }
        val token = jwtUtil.generateToken(user.id, user.username, user.role.name)
        return AuthResponse(success = true, token = token, user = user.toInfo())
    }

    // 修改密码
    fun changePassword(userId: Long, oldPassword: String, newPassword: String): AuthResponse {
        val user = userRepository.findById(userId).orElse(null)
            ?: return AuthResponse(success = false, message = "用户不存在")
        if (!passwordService.matches(oldPassword, user.passwordHash)) {  // ✅ 验证旧密码
            return AuthResponse(success = false, message = "旧密码错误")
        }
        if (newPassword.length < 3) {
            return AuthResponse(success = false, message = "新密码至少3个字符")
        }
        userRepository.save(user.copy(
            passwordHash = passwordService.hash(newPassword),  // ✅ 新密码 BCrypt 哈希
            updatedAt = Instant.now()
        ))
        log.info("User {} changed password", user.username)
        return AuthResponse(success = true, message = "密码修改成功")
    }
}
```

**步骤 4：修改 DataInitializer.kt**

```kotlin
// 注入 PasswordService
class DataInitializer(
    private val userRepo: UserRepository,
    // ...其他依赖...
    private val passwordService: PasswordService    // 新增注入
) : CommandLineRunner {
    override fun run(vararg args: String?) {
        // 创建预设用户时使用 BCrypt 哈希
        passwordHash = passwordService.hash(adminPassword)
        // ...
        passwordHash = passwordService.hash("principal123")
    }
}
```

### 8.3 BCrypt 密码迁移

如果系统已有用户（密码存明文），你需要迁移：

```kotlin
// 迁移脚本 —— 在登录时自动升级
fun login(username: String, password: String): AuthResponse {
    val user = userRepository.findByUsername(username)
    // ...
    
    // 检测是否仍为明文密码
    val isPlainText = user.passwordHash == password  // 明文比较
    val isBcrypt = if (!isPlainText) passwordService.matches(password, user.passwordHash) else false
    
    if (isPlainText) {
        // 将明文升级为 BCrypt 哈希
        userRepository.save(user.copy(passwordHash = passwordService.hash(password)))
        log.info("Upgraded password hash for user {} to BCrypt", user.username)
    } else if (!isBcrypt) {
        return AuthResponse(success = false, message = "用户名或密码错误")
    }
    // ...生成 token 返回...
}
```

---

## 9. 前端安全

### 9.1 JWT Token 存储

**当前状态**：token 存储在 `localStorage`

```javascript
// 前端 app.js
localStorage.setItem('token', token);
```

**风险**：localStorage 无法设置 HttpOnly，存在 XSS 泄露风险。

**替代方案**：使用 HttpOnly Cookie

```nginx
# 如果后端支持 HttpOnly Cookie 方式
```

但目前后端是 JWT Bearer 模式，前端通过 `Authorization` header 发送。折中方案：

```javascript
// 前端安全建议
// 1. 不使用 URL 参数传递 token
// 2. 不在第三方脚本中暴露 token
// 3. 生产环境使用 HTTPS 传输

// 4. 检查是否在 HTTP 页面访问
if (location.protocol !== 'https:') {
    console.warn('⚠️ 请在 HTTPS 下使用，否则 token 可能被泄露');
}

// 5. 登出时清除 token
localStorage.removeItem('token');
```

### 9.2 XSS 防护

**当前风险**：app.js 大量使用 `innerHTML` 渲染经文内容

```javascript
// 风险代码
element.innerHTML = htmlContent;   // 如果 content 来自用户输入...

// 修复方案
function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
```

目前系统已有 `escHtml()` 函数，确保所有用户输入都经过转义。

### 9.3 CSP 安全头

在 nginx 中添加 Content Security Policy：

```nginx
location / {
    add_header Content-Security-Policy "
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval';
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        img-src 'self' data: blob: https://*.mapbox.com;
        font-src 'self' https://fonts.gstatic.com;
        connect-src 'self' http://localhost:8080;
        frame-src 'none';
        object-src 'none';
    ";
}
```

---

## 10. nginx 安全加固

### 10.1 完整安全配置

```nginx
server {
    listen 443 ssl http2;
    server_name bible.yourdomain.com;

    # SSL 配置
    ssl_certificate     /etc/letsencrypt/live/bible.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bible.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 安全头
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy strict-origin-when-cross-origin;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()";

    # 隐藏 nginx 版本
    server_tokens off;

    # 请求体大小限制
    client_max_body_size 10M;

    # 限制请求速率（防止暴力破解）
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    location /api/v1/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://localhost:8080;
    }

    location /api/v1/auth/register {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://localhost:8080;
    }

    # 拒绝 H2 控制台外网访问
    location /h2-console {
        deny all;
        return 403;
    }

    # 拒绝 Actuator 外网访问
    location /actuator {
        deny all;
        return 403;
    }

    # API 代理
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 前端静态文件
    location /bible/ {
        alias /opt/bible-microservices/frontend/;
        index index.html;
        try_files $uri $uri/ /bible/index.html;
    }

    # 根路径
    location / {
        root /var/www/html/;
        index index.html;
    }
}

server {
    listen 80;
    server_name bible.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 11. 应用层安全配置

### 11.1 最终安全的 application.yml

```yaml
# ============================================================
# bible-monolith - 生产环境安全配置
# 所有密码/密钥从环境变量读取，禁止硬编码
# ============================================================

server:
  port: 8080

spring:
  datasource:
    url: jdbc:h2:file:./data/text-db;DB_CLOSE_ON_EXIT=FALSE;MODE=MySQL
    username: sa
    password: ${H2_PASSWORD}            # 从环境变量读取

  h2:
    console:
      enabled: false                     # 生产环境关闭

  jpa:
    hibernate:
      ddl-auto: update
    show-sql: false                      # 生产环境关闭 SQL 日志

  cache:
    type: caffeine
    caffeine:
      spec: maximumSize=500,expireAfterAccess=30m

  servlet:
    multipart:
      max-file-size: 10MB                # 降低上传限制
      max-request-size: 10MB

jwt:
  secret: ${JWT_SECRET}                  # 从环境变量读取
  expiration-ms: 7200000                 # 2h（生产环境缩短有效期）

app:
  admin:
    username: ${ADMIN_USERNAME:admin}     # 可选覆盖
    password: ${ADMIN_PASSWORD}           # 必须从环境变量读取
  principal:
    username: ${PRINCIPAL_USERNAME:principal}
    password: ${PRINCIPAL_PASSWORD}

sword:
  modules-path: data/sword-mods

kb:
  node-service-url: http://localhost:3000
  library-path: frontend/library-data

management:
  endpoints:
    web:
      exposure:
        include: health                  # 只保留 health
      base-path: /internal
  endpoint:
    health:
      show-details: never                # 不显示详情

logging:
  level:
    com.bible.monolith: WARN             # 生产环境 WARN
    org.crosswire: WARN
    org.hibernate.SQL: WARN
  pattern:
    console: "%d{HH:mm:ss} %-5level %logger{36} - %msg%n"
```

### 11.2 启动脚本模板

**Linux（/opt/bible-microservices/start.sh）**：

```bash
#!/bin/bash
# Bible Monolith 生产环境启动脚本

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

export JWT_SECRET=$(cat /etc/bible/secrets/jwt-secret.txt)
export H2_PASSWORD=$(cat /etc/bible/secrets/h2-password.txt)
export ADMIN_PASSWORD=$(cat /etc/bible/secrets/admin-password.txt)

nohup java \
  -Dfile.encoding=UTF-8 \
  -Xms48m -Xmx256m \
  -DJWT_SECRET="$JWT_SECRET" \
  -DH2_PASSWORD="$H2_PASSWORD" \
  -DADMIN_PASSWORD="$ADMIN_PASSWORD" \
  -jar bible-monolith.jar \
  --sword.modules-path=data/sword-mods \
  > logs/monolith.log 2>&1 &

echo "Monolith started with PID $!"
```

**Windows PowerShell（start.ps1）**：

```powershell
# Bible Monolith 生产环境启动脚本
Set-Location "D:\dev\github\bible-microservices"

$env:JWT_SECRET = Get-Content -Raw "C:\secrets\bible\jwt-secret.txt"
$env:H2_PASSWORD = Get-Content -Raw "C:\secrets\bible\h2-password.txt" 
$env:ADMIN_PASSWORD = Get-Content -Raw "C:\secrets\bible\admin-password.txt"

java -Dfile.encoding=UTF-8 -Xms48m -Xmx256m `
  -DJWT_SECRET=$env:JWT_SECRET `
  -DH2_PASSWORD=$env:H2_PASSWORD `
  -DADMIN_PASSWORD=$env:ADMIN_PASSWORD `
  -jar bible-monolith\build\libs\bible-monolith.jar `
  --sword.modules-path=data\sword-mods
```

### 11.3 生成密钥文件的初始化脚本

```bash
#!/bin/bash
# /opt/bible-microservices/init-secrets.sh
# 首次部署时运行，生成随机密钥

mkdir -p /etc/bible/secrets
chmod 700 /etc/bible/secrets

# JWT secret (64 bytes base64)
openssl rand -base64 64 > /etc/bible/secrets/jwt-secret.txt

# H2 password (32 bytes base64)
openssl rand -base64 32 > /etc/bible/secrets/h2-password.txt

# Admin password (12 bytes base64)
openssl rand -base64 12 > /etc/bible/secrets/admin-password.txt

# Principal password (12 bytes base64)
openssl rand -base64 12 > /etc/bible/secrets/principal-password.txt

chmod 600 /etc/bible/secrets/*.txt

echo "Secrets generated:"
ls -la /etc/bible/secrets/
cat /etc/bible/secrets/admin-password.txt  # 打印管理员密码，请保存！
```

---

## 12. 安全配置总表

### 12.1 配置项对照

| 配置项 | 开发环境 | 生产环境 | 修改方式 |
|--------|----------|----------|----------|
| `jwt.secret` | 预置字符串 | 环境变量 `JWT_SECRET` | application.yml + env |
| `spring.datasource.password` | 空 | 环境变量 `H2_PASSWORD` | application.yml + env |
| `app.admin.password` | admin123 | 环境变量 `ADMIN_PASSWORD` | application.yml + env |
| `app.principal.password` | principal123 | 环境变量 `PRINCIPAL_PASSWORD` | 需新增配置项 |
| `spring.h2.console.enabled` | true | `false` | application.yml |
| `management.endpoints.web.exposure.include` | health,info,metrics,caches | `health` 仅 | application.yml |
| `spring.jpa.show-sql` | false | `false` | application.yml |
| `logging.level.com.bible.monolith` | DEBUG | `WARN` | application.yml |
| `client_max_body_size` (nginx) | 100M | `10M` | nginx config |
| HTTPS | 无 | 必须 | nginx config + certbot |

### 12.2 必须设置的环境变量

| 环境变量 | 说明 | 是否必填 | 生成方式 |
|----------|------|----------|----------|
| `JWT_SECRET` | JWT 签名密钥（64 bytes base64） | ✅ 必填 | `openssl rand -base64 64` |
| `H2_PASSWORD` | 数据库密码（32 bytes base64） | ✅ 必填 | `openssl rand -base64 32` |
| `ADMIN_PASSWORD` | 管理员密码 | ✅ 必填 | `openssl rand -base64 12` |
| `PRINCIPAL_PASSWORD` | 校长密码 | ⬜ 建议 | `openssl rand -base64 12` |

### 12.3 改前 vs 改后对比

| 项目 | 改前 | 改后 |
|------|------|------|
| 数据库密码 | 空 | 随机 32 bytes base64 |
| JWT secret | 硬编码 `bWljcm9zZXJ2aWNlcy1iaWJsZS1hdXRoLWp3dC1zZWNyZXQta2V5LTIwMjYtMDYtMTQ=` | 环境变量 64 bytes 随机 |
| 管理员密码 | `admin123` | 环境变量随机 |
| 密码存储 | 明文 | BCrypt |
| H2 控制台 | 开启 | 关闭 |
| Actuator | 全部暴露 | 仅 health |
| 日志级别 | DEBUG | WARN |
| HTTPS | 无 | Let's Encrypt |

---

## 13. 安全部署检查清单

### 13.1 部署前检查

- [ ] JWT secret 已改为环境变量（不是硬编码）
- [ ] H2 数据库已设置密码
- [ ] H2 控制台已关闭
- [ ] 管理员密码已改为强密码（不是 admin123）
- [ ] 所有预设账户密码已改为环境变量
- [ ] Actuator 端点已限缩（仅 health）
- [ ] 密码存储已改为 BCrypt
- [ ] HTTPS 证书已配置
- [ ] nginx 安全头已配置
- [ ] CSP 策略已添加
- [ ] 登录请求速率限制已配置
- [ ] H2 控制台 nginx 层拦截已配置
- [ ] Actuator nginx 层拦截已配置
- [ ] 日志级别已改为 WARN
- [ ] server_tokens 已关闭
- [ ] 敏感文件（jwt-secret.txt 等）权限 600
- [ ] 密钥文件目录权限 700
- [ ] 从代码库中移除了硬编码的密码/密钥
- [ ] .gitignore 包含 secrets/ 目录
- [ ] 启动脚本不含明文密码

### 13.2 部署后验证

```bash
# 1. 验证后端运行
curl -s https://bible.yourdomain.com/actuator/health

# 2. 验证 H2 控制台被拦截
curl -s -o /dev/null -w "%{http_code}" https://bible.yourdomain.com/h2-console
# 预期：403

# 3. 验证 Actuator 路径限制
curl -s -o /dev/null -w "%{http_code}" https://bible.yourdomain.com/actuator/metrics
# 预期：403

# 4. 验证 HTTPS
curl -sI https://bible.yourdomain.com/ | grep -i "strict-transport"

# 5. 验证登录
curl -s -X POST https://bible.yourdomain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"你的管理员密码"}'

# 6. 验证 nginx 版本隐藏
curl -sI https://bible.yourdomain.com/ | grep -i "server"
# 预期：只有 "server: nginx"，没有版本号
```

### 13.3 密码修改周期建议

| 密码类型 | 修改周期 | 说明 |
|----------|----------|------|
| JWT secret | 每季度 | 改后所有旧 token 失效，需重新登录 |
| H2 密码 | 每季度 | 需重建数据库 |
| 管理员密码 | 每月 | 登录后台修改 |
| Let's Encrypt | 每90天 | certbot 自动续期 |

---

## 附录 A：安全命令速查

```bash
# 生成随机密钥（Linux）
openssl rand -base64 64  # JWT secret
openssl rand -base64 32  # H2 password
openssl rand -base64 12  # 普通密码

# 生成随机密钥（Windows PowerShell）
[Convert]::ToBase64String((1..64|%{Get-Random -Max 256}))

# 查看密钥文件权限
ls -la /etc/bible/secrets/

# 测试登录速率限制
for i in $(seq 1 20); do curl -s -o /dev/null -w "%{http_code} " -X POST http://localhost/api/v1/auth/login; done

# 测试 HSSTS 头
curl -sI https://bible.yourdomain.com | grep -i strict-transport

# 证书续期测试
certbot renew --dry-run
```

## 附录 B：需要修改的文件列表

| 文件 | 修改内容 | 难度 |
|------|----------|------|
| `application.yml` | JWT secret → 环境变量、H2 密码 → 环境变量、管理员密码 → 环境变量、H2 控制台关闭、Actuator 限缩 | 低 |
| `AuthService.kt` | 新增 PasswordService 注入，注册/登录/改密使用 BCrypt | 中 |
| `PasswordService.kt` | 新建文件，BCrypt 哈希和验证 | 低 |
| `DataInitializer.kt` | 预设账户密码使用 BCrypt 哈希 | 低 |
| `build.gradle.kts` | 添加 spring-security-crypto 依赖 | 低 |
| nginx 配置 | HTTPS/CSP/速率限制/安全头 | 低 |
| 启动脚本 | 增加环境变量传入 | 低 |

---

*本文档最后更新：2026-07-23*
