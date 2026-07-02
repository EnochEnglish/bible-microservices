# 部署指南 — Bible Monolith v20260701b

## 服务器信息

| 项 | 值 |
|---|---|
| ECS IP | 8.222.165.245 |
| SSH 用户 | ccscw |
| 密码 | godblessme |
| Java | OpenJDK 17（已安装） |
| 部署根目录 | /opt/bible-microservices/ |
| 前端目录 | /var/www/html/bible/ |
| nginx 配置 | /etc/nginx/sites-enabled/default |

---

## 一、需要上传的文件

### 1. 后端 JAR（1个文件）

```
本地: D:\dev\github\bible-microservices\dist\bible-monolith.jar  (75.3 MB)
服务器: /opt/bible-microservices/bible-monolith.jar
```

### 2. 前端文件（14个文件）

```
本地目录: D:\dev\github\bible-microservices\frontend\
服务器目录: /var/www/html/bible/
```

| 本地路径 | 服务器路径 | 说明 |
|----------|-----------|------|
| `index.html` | `/var/www/html/bible/index.html` | 桌面版主页 |
| `library.html` | `/var/www/html/bible/library.html` | **新增** 图书馆页面 |
| `server.js` | `/var/www/html/bible/server.js` | 前端代理服务（如用 Node 前端） |
| `css/style.css` | `/var/www/html/bible/css/style.css` | 桌面版样式 |
| `css/library.css` | `/var/www/html/bible/css/library.css` | **新增** 图书馆样式 |
| `js/app.js` | `/var/www/html/bible/js/app.js` | 桌面版主逻辑 |
| `js/config.js` | `/var/www/html/bible/js/config.js` | 部署配置 |
| `js/api.js` | `/var/www/html/bible/js/api.js` | API 封装 |
| `js/morphology.js` | `/var/www/html/bible/js/morphology.js` | 形态码词典 |
| `js/library.js` | `/var/www/html/bible/js/library.js` | **新增** 图书馆逻辑 |
| `m/index.html` | `/var/www/html/bible/m/index.html` | 手机版主页 |
| `m/mobile.js` | `/var/www/html/bible/m/mobile.js` | 手机版逻辑 |
| `m/mobile.css` | `/var/www/html/bible/m/mobile.css` | 手机版样式 |
| `m/manifest.json` | `/var/www/html/bible/m/manifest.json` | PWA manifest |

### 3. SWORD 模块（新增 98 个目录）

```
本地: D:\dev\github\bible-microservices\data\sword-mods\  (422.7 MB, 123 个目录)
服务器: /opt/bible-microservices/data/sword-mods/
```

服务器已有 25 个模块，需新增 98 个模块目录。**不要覆盖已有目录**。

新增模块清单（98个）：
```
2babdict, abbott, abbottsmith, abbottsmithstrongs, abs_essay_goodsam_swb,
alzat, amtract, baptistconfession1646, baptistconfession1689, barnes,
bdbglosses_strongs, burkitt, calvincommentaries, catena, cawdrey, cbc,
chisstrongsgreek, chisstrongshebrew, chitstrongsgreek, chitstrongshebrew,
clarke, concord, darknightofthesoul, dbd, didache, dodson, dtn, embreality,
enoch, eusebian, family, finney, fvdpvietanh, geneva, greekhebrew, hebrewgreek,
heretics, hitchcock, imitation, institutes, jcrholiness, jeaffections,
jesermons, jfb, jochrist, jocommgod, joglory, jomortsin, josephus, jubilees,
kd, kingcomments, lawgospel, lightfoot, luther, mak, mhcc, mlstrong,
mollcolossians, netnotesfree, orthodoxy, oshm, packard, passion, personal,
phaistos, pnt, practice, quotingpassages, rieger, robinson, rwp, saoa,
sblgntapp, scofield, sentiment, smith, spurious, summa, tcr, tdavid, tfg,
torrey, varapp, vulgglossa, webster1806, webster1828, webster1913, wesley,
westminster, westminster21, zhenglish, zhhanzi, zhpinyin
```

### 4. 不需要上传的文件

| 文件/目录 | 原因 |
|-----------|------|
| `data/text-db.mv.db` | 服务器已有 231MB H2 数据库，**不要覆盖** |
| `data/auth-db.mv.db` | 服务器已有用户数据 |
| `data/sword-dicts/` | Strong's 词典已在 JAR 内 |
| `data/search-index/` | 搜索索引运行时生成 |
| `data/WLC/` | 不需要 |
| `_*.js`, `test_*.js`, `*.ps1` | 临时脚本 |
| `*.md` | 文档文件 |

---

## 二、部署步骤

### 步骤 1：停止旧进程

```bash
# SSH 到服务器
ssh ccscw@8.222.165.245

# 停止 monolith
pkill -f bible-monolith.jar

# 确认已停止
ps aux | grep java
```

### 步骤 2：备份旧 JAR

```bash
cd /opt/bible-microservices
cp bible-monolith.jar bible-monolith.jar.bak
```

### 步骤 3：上传新 JAR

用 FTP 或 scp 上传：
```
本地: D:\dev\github\bible-microservices\dist\bible-monolith.jar
服务器: /opt/bible-microservices/bible-monolith.jar
```

FTP 方式：
```bash
ftp 8.222.165.245
# 用户: ccscw  密码: godblessme
cd /opt/bible-microservices
put bible-monolith.jar
bye
```

### 步骤 4：上传前端文件

```bash
# 前端文件上传到 /var/www/html/bible/
ftp 8.222.165.245
cd /var/www/html/bible
put index.html
put library.html
cd css
put style.css
put library.css
cd ../js
put app.js
put config.js
put api.js
put morphology.js
put library.js
cd ../m
put index.html
put mobile.js
put mobile.css
put manifest.json
bye
```

### 步骤 5：上传 SWORD 模块

将本地 `data/sword-mods/` 下 98 个新模块目录打包上传：

```bash
# 本地打包（PowerShell）
cd D:\dev\github\bible-microservices\data\sword-mods
# 用 7z 或 tar 打包所有新模块
tar -czf sword-mods-new.tar.gz 2babdict abbott abbottsmith ...（所有98个目录名）

# 上传
ftp 8.222.165.245
cd /opt/bible-microservices/data/sword-mods
binary
put sword-mods-new.tar.gz
bye

# SSH 解压
ssh ccscw@8.222.165.245
cd /opt/bible-microservices/data/sword-mods
tar -xzf sword-mods-new.tar.gz
rm sword-mods-new.tar.gz
```

### 步骤 6：创建地图模块符号链接（如尚未创建）

```bash
cd /opt/bible-microservices/data/sword-mods
ln -sf BibleAtlas bibleatlas
ln -sf BibleMap biblemap
```

### 步骤 7：启动 Monolith

```bash
cd /opt/bible-microservices

# 启动（低内存模式）
nohup java -Xms48m -Xmx256m -jar bible-monolith.jar > monolith.log 2>&1 &

# 等待启动（约 20-30 秒）
sleep 25

# 验证
curl -s http://localhost:8080/api/v1/bible/translations | head -100
curl -s http://localhost:8080/api/v1/sword/modules | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Total: {d[\"total\"]}')"
```

预期输出：
- `Total: 123`（模块数）
- 22+ 个译本

### 步骤 8：验证 nginx

```bash
# 检查 nginx 状态
systemctl status nginx

# 如未运行则启动
sudo systemctl start nginx

# 测试前端
curl -s http://localhost/bible/ | head -5
curl -s http://localhost/bible/library.html | head -5

# 测试 API 代理
curl -s http://localhost/api/v1/sword/modules | head -100
```

### 步骤 9：完整验证

```bash
# 模块总数
curl -s http://localhost:8080/api/v1/sword/modules | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Total modules: {d[\"total\"]}')
for cat, count in d['byCategory'].items():
    print(f'  {cat}: {count}')
"

# 注释源
curl -s http://localhost:8080/api/v1/annotations/commentary-sources | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Commentary sources: {len(d[\"sources\"])}')
for s in d['sources']:
    print(f'  {s[\"id\"]} ({s[\"name\"]}) [{s[\"storage\"]}]')
"

# 图书馆 GenBook
curl -s 'http://localhost:8080/api/v1/sword/genbook/Pilgrim/keys?limit=3' | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Pilgrim keys: {d[\"data\"][\"totalCount\"]}')
"

# 验证前端
curl -s http://localhost/bible/library.html | grep '基督教经典图书馆'
```

---

## 三、电子书目录（35本）

### 经典著作（31本）

| 缩写 | 书名 | 作者 |
|------|------|------|
| alzat | Alzat yli opastus | (芬兰语灵修) |
| BaptistConfession1646 | First Baptist Confession of Faith 1646 | Benjamin Cox |
| BaptistConfession1689 | Baptist Confession of Faith 1689 | - |
| Concord | Book of Concord (Triglot) | 路德宗信纲 |
| Didache | Didache (十二使徒遗训) | - |
| DarkNightOfTheSoul | 灵魂黑夜 | St. John of the Cross |
| EMBReality | 祷告的真实 | E.M. Bounds |
| Enoch | 以诺书 | - |
| Finney | 芬尼讲道集 | Charles G. Finney |
| Heretics | 异端 | G.K. Chesterton |
| Imitation | 效法基督 | Thomas à Kempis |
| Institutes | 基督教要义 | John Calvin |
| JCRHoliness | 圣洁 | J.C. Ryle |
| JEAffections | 宗教情感 | Jonathan Edwards |
| JESermons | 爱德华兹讲道集 | Jonathan Edwards |
| JOChrist | 基督论 | John Owen |
| JOCommGod | 与神交通 | John Owen |
| JOGlory | 基督的荣耀 | John Owen |
| JOMortSin | 治死罪 | John Owen |
| Josephus | 约瑟夫全集 | Flavius Josephus |
| Jubilees | 禧年书 | - |
| LawGospel | 律法与福音 | C.F.W. Walther |
| MollColossians | 歌罗西书灵修 | Randy Moll |
| Orthodoxy | 正统 | G.K. Chesterton |
| Passion | 主的受难 | - |
| Phaistos | 费斯托斯盘 | - |
| Pilgrim | 天路历程 | John Bunyan |
| Practice | 与神同在 | Brother Lawrence |
| Summa | 神学大全 | Thomas Aquinas |
| Westminster | 威斯敏斯特信条 | - |
| Westminster21 | 威斯敏斯特信条（现代版） | - |

### 每日灵修（3本）

| 缩写 | 书名 | 作者 |
|------|------|------|
| Daily | 每日灵粮 | Jonathan Bagster |
| DBD | 恩典日日新 | Bob Hoekstra |
| SME | 清晨甘露·静夜亮光 | C.H. Spurgeon |

### 论文（1本）

| 缩写 | 书名 |
|------|------|
| ABS_Essay_GoodSam_SWB | Essays on The Good Samaritan |

---

## 四、回滚方案

```bash
# 如新版本有问题，回滚
cd /opt/bible-microservices
pkill -f bible-monolith.jar
cp bible-monolith.jar.bak bible-monolith.jar
nohup java -Xms48m -Xmx160m -jar bible-monolith.jar > monolith.log 2>&1 &
```

---

## 五、systemd 自启动（可选，推荐）

```bash
sudo tee /etc/systemd/system/bible-monolith.service > /dev/null << 'EOF'
[Unit]
Description=Bible Monolith Service
After=network.target

[Service]
Type=simple
User=ccscw
WorkingDirectory=/opt/bible-microservices
ExecStart=/usr/bin/java -Xms48m -Xmx256m -jar /opt/bible-microservices/bible-monolith.jar
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable bible-monolith
sudo systemctl start bible-monolith
```

---

## 六、文件大小汇总

| 组件 | 大小 | 说明 |
|------|------|------|
| bible-monolith.jar | 75.3 MB | 后端 JAR |
| 前端文件（14个） | ~0.4 MB | HTML/CSS/JS |
| SWORD 模块（新增98个） | ~350 MB | 注释/词典/经典著作 |
| **部署包总计** | **~425 MB** | - |
