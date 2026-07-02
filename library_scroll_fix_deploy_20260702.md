# 图书馆滚动 Bug 修复 + 部署指南 — 2026-07-02a

## 目标
1. 修复图书馆阅读器无法下拉滚动的 Bug
2. 整理发布到服务器的部署指导文件

## Bug 修复：图书馆阅读器无法下拉

### 根因
`library.html` 引入了桌面版 `style.css`，其中第 12 行：
```css
body { height:100vh; overflow:hidden; }
```
把 body 锁死在 100vh 高度并隐藏溢出，导致内容超出屏幕后无法滚动。

### 修复
`library.css` 中用 `!important` 覆盖 body 的 height 和 overflow：
```css
html, body {
  margin: 0 !important;
  padding: 0 !important;
  height: auto !important;
  overflow-y: auto !important;
  background: var(--lib-bg) !important;
}
```

同时给 `.lib-reader-content` 添加 `padding-bottom: 4rem` 确保底部有空间。

### 版本号
v=20260702a

## 部署指南

完整部署指南已写入 `DEPLOYMENT-GUIDE-20260702a.md`，包含：

### 上传 3 类文件
1. **JAR**（75.3 MB）：`dist\bible-monolith.jar` → `/opt/bible-microservices/`
2. **前端文件**（14 个，413 KB）→ `/var/www/html/bible/`
3. **SWORD 模块**（101 个新目录，263 MB）→ `/opt/bible-microservices/data/sword-mods/`

### 9 步部署
1. `pkill -f bible-monolith.jar` — 停旧进程
2. `cp bible-monolith.jar bible-monolith.jar.bak` — 备份
3. 上传新 JAR
4. 上传前端文件
5. 上传 SWORD 模块（tar 打包上传后解压）
6. `ln -sf BibleAtlas bibleatlas; ln -sf BibleMap biblemap` — 地图符号链接
7. `nohup java -Xms48m -Xmx256m -jar bible-monolith.jar > monolith.log 2>&1 &` — 启动
8. 验证：模块总数 126、注释源 34
9. 验证前端：`curl localhost/bible/library.html`

### 不要上传
- `data/text-db.mv.db`（231 MB，服务器已有）
- `data/auth-db.mv.db`（用户数据）
- 临时脚本和文档

### 电子书目录（35 本）
- 经典著作 31 本（效法基督、基督教要义、天路历程、神学大全等）
- 每日灵修 3 本（司布真、每日灵粮、恩典日日新）
- 论文 1 本（好撒玛利亚人）

### 部署包总计
~339 MB（JAR 75MB + 前端 0.4MB + SWORD 模块 263MB）
