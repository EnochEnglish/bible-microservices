# 自建 SWORD 模块仓库指南

> 你只需要两样东西：一个 HTTP 服务器，和正确的文件结构。系统会自动处理其余的一切。

## 1. 你需要什么

- **一个能通过 URL 访问的服务器**（任意 HTTP 服务器，哪怕是 GitHub Pages）
- **模块 ZIP 包放在 `packages/rawzip/` 目录下**
- **一个 `mods.d.tar.gz` 索引文件放在仓库根目录**

## 2. 最简单的目录结构

```
my-sword-repo/               # 仓库根目录 = HTTP 根目录
├── mods.d.tar.gz            # 必须有：模块目录索引
└── packages/
    └── rawzip/              # 必须有：ZIP 包就放这里
        ├── MyModule.zip     # 你的模块包
        └── Another.zip      # 可以有多个
```

系统会自动从 URL 找到 `mods.d.tar.gz`（索引）和 `packages/rawzip/`（模块包）。

## 3. 准备模块

### 方式 A：直接用 CrossWire 的模块

从 [CrossWire](https://crosswire.org/sword/modules/) 下载现成的 ZIP，直接放 `packages/rawzip/`。

### 方式 B：自己做模块

1. 创建目录结构：
   ```
   模块名/
   ├── mods.d/
   │   └── 模块名/
   │       └── 模块名.conf     # 模块配置
   └── modules/
       └── ...
   ```

2. 打包：`zip -r MyModule.zip mods.d modules`（保持 `mods.d/` 和 `modules/` 在 ZIP 根层）

3. 放入 `packages/rawzip/`

### .conf 文件示例

```
[MyModule]
Description=我的自定义注释
About=自己整理的资料
Category=Commentaries
Lang=zh
Version=1.0
DataPath=./modules/comments/zcom/mymodule/
```

## 4. 生成 mods.d.tar.gz

在仓库根目录执行：

**Windows（自带 tar）：**
```powershell
tar -czf mods.d.tar.gz mods.d/
```

**Mac / Linux：**
```bash
tar -czf mods.d.tar.gz mods.d/
```

## 5. 搭建 HTTP 服务器

### 最简单：Python

```bash
cd my-sword-repo
python3 -m http.server 8080
# 仓库地址：http://你的IP:8080/
```

### 用 GitHub Pages（免费）

1. 建一个 GitHub 仓库
2. 把 `my-sword-repo/` 的内容推上去
3. 开启 Settings → Pages
4. 仓库地址：`https://用户名.github.io/仓库名/`

### 用 Nginx / Apache / IIS

配一个静态站点，根目录指向 `my-sword-repo/`。确保支持 `.tar.gz` 和 `.zip` 的 MIME 类型。

## 6. 在阅读器中添加仓库

1. 打开阅读器 → 📦 模块 → **⚙ 管理仓库** → **➕ 添加仓库**
2. 只需填两个字段：
   - **名称**：任意（如"我搭建的仓库"）
   - **地址**：HTTP 根目录 URL（如 `http://我的IP:8080` 或 `https://我的用户.github.io/my-sword-repo`）

3. 点保存。仓库立刻出现在来源下拉列表中。

系统会自动找到 `mods.d.tar.gz` 和 `packages/rawzip/`，你不需要操心任何路径细节。

## 7. 验证是否正常

浏览器直接访问这两个地址：
```
https://你的域名/路径/mod.d.tar.gz        → 应触发下载
https://你的域名/路径/packages/rawzip/test.zip  → 应触发下载
```

能下载就对了。

## 8. 常见问题

**Q: 模块安装后找不到？**
确认 ZIP 文件名 = 模块名 ，ZIP 内部路径正确（`mods.d/` 和 `modules/` 在根层）。

**Q: mods.d.tar.gz 为什么无效？**
确认是 `tar` + `gzip` 压缩（不是 zip 格式），内部路径以 `mods.d/` 开头。

**Q: 可以用 FTP 吗？**
系统目前支持 HTTPS（推荐）和 HTTP。FTP 不支持。

**Q: 可以添加多个仓库吗？**
可以。每个仓库都会出现在来源下拉列表中。

**Q: CDN / 对象存储可以用吗？**
只要 URL 能直接下载文件就能用。AWS S3、阿里云 OSS、Cloudflare R2 都支持。