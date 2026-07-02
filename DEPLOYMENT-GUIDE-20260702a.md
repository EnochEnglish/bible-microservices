# 部署指南 — Bible Monolith v20260702a

## 服务器信息

| 项 | 值 |
|---|---|
| ECS IP | 8.222.165.245 |
| SSH 用户 | ccscw |
| 密码 | godblessme |
| Java | OpenJDK 17 |
| 部署根目录 | /opt/bible-microservices/ |
| 前端目录 | /var/www/html/bible/ |
| nginx 配置 | /etc/nginx/sites-enabled/default |

---

## 一、需要上传的文件

### 1. 后端 JAR（1 个文件，75.3 MB）

| 本地路径 | 服务器路径 |
|----------|-----------|
| `dist\bible-monolith.jar` | `/opt/bible-microservices/bible-monolith.jar` |

### 2. 前端文件（14 个文件，共 413 KB）

| 本地路径 | 服务器路径 | 说明 |
|----------|-----------|------|
| `frontend\index.html` | `/var/www/html/bible/index.html` | 桌面版主页 |
| `frontend\library.html` | `/var/www/html/bible/library.html` | **新增** 图书馆页面 |
| `frontend\server.js` | `/var/www/html/bible/server.js` | 前端代理服务 |
| `frontend\css\style.css` | `/var/www/html/bible/css/style.css` | 桌面版样式 |
| `frontend\css\library.css` | `/var/www/html/bible/css/library.css` | **新增** 图书馆样式 |
| `frontend\js\app.js` | `/var/www/html/bible/js/app.js` | 桌面版主逻辑 |
| `frontend\js\config.js` | `/var/www/html/bible/js/config.js` | 部署配置 |
| `frontend\js\api.js` | `/var/www/html/bible/js/api.js` | API 封装 |
| `frontend\js\morphology.js` | `/var/www/html/bible/js/morphology.js` | 形态码词典 |
| `frontend\js\library.js` | `/var/www/html/bible/js/library.js` | **新增** 图书馆逻辑 |
| `frontend\m\index.html` | `/var/www/html/bible/m/index.html` | 手机版主页 |
| `frontend\m\mobile.js` | `/var/www/html/bible/m/mobile.js` | 手机版逻辑 |
| `frontend\m\mobile.css` | `/var/www/html/bible/m/mobile.css` | 手机版样式 |
| `frontend\m\manifest.json` | `/var/www/html/bible/m/manifest.json` | PWA manifest |

### 3. SWORD 模块（新增 101 个目录，共 263 MB）

| 本地路径 | 服务器路径 |
|----------|-----------|
| `data\sword-mods\` 下 101 个新目录 | `/opt/bible-microservices/data/sword-mods/` |

服务器已有 25 个模块目录，不要覆盖。新增 101 个目录列表：

```
2babdict, abbott, abbottsmith, abbottsmithstrongs, abs_essay_goodsam_swb,
alzat, amtract, baptistconfession1646, baptistconfession1689, barnes,
bdbglosses_strongs, burkitt, calvincommentaries, catena, cawdrey, cbc,
chincvt, chisb, chisstrongsgreek, chisstrongshebrew, chitstrongsgreek,
chitstrongshebrew, chiunl, clarke, concord, darknightofthesoul, dbd,
didache, dodson, dtn, embreality, enoch, eusebian, family, finney,
fvdpvietanh, geneva, greekhebrew, hebrewgreek, heretics, hitchcock,
imitation, institutes, jcrholiness, jeaffections, jesermons, jfb,
jochrist, jocommgod, joglory, jomortsin, josephus, jubilees, kd,
kingcomments, lawgospel, lightfoot, luther, mak, mhcc, mlstrong,
mollcolossians, netnotesfree, orthodoxy, oshm, packard, passion, personal,
phaistos, pnt, practice, quotingpassages, rieger, robinson, rwp, saoa,
sblgntapp, scofield, sentiment, smith, spurious, summa, tcr, tdavid, tfg,
torrey, varapp, vulgglossa, webster1806, webster1828, webster1913, wesley,
westminster, westminster21, zhenglish, zhhanzi, zhpinyin
```

### 4. ⚠️ 不要上传的文件

| 文件 | 原因 |
|------|------|
| `data/text-db.mv.db` (231 MB) | 服务器已有，**覆盖会丢失数据** |
| `data/auth-db.mv.db` | 服务器已有用户数据 |
| `data/sword-dicts/` | Strong's 词典已打包在 JAR 内 |
| `data/search-index/` | 搜索索引运行时生成 |
| `_*.js`, `*.ps1`, `test_*` | 临时脚本 |
| `*.md` | 文档文件 |

---

## 二、部署步骤（9 步）

### 步骤 1：停止旧进程

```bash
ssh ccscw@8.222.165.245
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

```bash
# FTP 方式
ftp 8.222.165.245
# 用户: ccscw  密码: godblessme
cd /opt/bible-microservices
binary
put bible-monolith.jar
bye
```

### 步骤 4：上传前端文件

```bash
# 上传到 /var/www/html/bible/
ftp 8.222.165.245
cd /var/www/html/bible
binary
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

```powershell
# 本地打包 101 个新模块目录
cd D:\dev\github\bible-microservices\data\sword-mods
tar -czf sword-mods-new.tar.gz 2babdict abbott abbottsmith abbottsmithstrongs abs_essay_goodsam_swb alzat amtract baptistconfession1646 baptistconfession1689 barnes bdbglosses_strongs burkitt calvincommentaries catena cawdrey cbc chincvt chisb chisstrongsgreek chisstrongshebrew chitstrongsgreek chitstrongshebrew chiunl clarke concord darknightofthesoul dbd didache dodson dtn embreality enoch eusebian family finney fvdpvietanh geneva greekhebrew hebrewgreek heretics hitchcock imitation institutes jcrholiness jeaffections jesermons jfb jochrist jocommgod joglory jomortsin josephus jubilees kd kingcomments lawgospel lightfoot luther mak mhcc mlstrong mollcolossians netnotesfree orthodoxy oshm packard passion personal phaistos pnt practice quotingpassages rieger robinson rwp saoa sblgntapp scofield sentiment smith spurious summa tcr tdavid tfg torrey varapp vulgglossa webster1806 webster1828 webster1913 wesley westminster westminster21 zhenglish zhhanzi zhpinyin
```

```bash
# 上传并解压
ftp 8.222.165.245
cd /opt/bible-microservices/data/sword-mods
binary
put sword-mods-new.tar.gz
bye

ssh ccscw@8.222.165.245
cd /opt/bible-microservices/data/sword-mods
tar -xzf sword-mods-new.tar.gz
rm sword-mods-new.tar.gz
```

### 步骤 6：创建地图模块符号链接

```bash
cd /opt/bible-microservices/data/sword-mods
ln -sf BibleAtlas bibleatlas
ln -sf BibleMap biblemap
```

### 步骤 7：启动 Monolith

```bash
cd /opt/bible-microservices
nohup java -Xms48m -Xmx256m -jar bible-monolith.jar > monolith.log 2>&1 &

# 等待启动（约 20-30 秒）
sleep 25
```

### 步骤 8：验证

```bash
# 模块总数应为 126
curl -s http://localhost:8080/api/v1/sword/modules | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Total modules: {d[\"total\"]}')
for cat, count in d['byCategory'].items():
    print(f'  {cat}: {count}')
"

# 预期输出:
# Total modules: 126
#   BIBLE: 20
#   DICTIONARY: 35
#   COMMENTARY: 33
#   DAILY_DEVOTIONS: 3
#   ESSAYS: 1
#   MAPS: 3
#   GENERAL_BOOK: 31
```

### 步骤 9：验证前端和图书馆

```bash
# 前端首页
curl -s http://localhost/bible/ | head -5

# 图书馆页面
curl -s http://localhost/bible/library.html | grep "基督教经典图书馆"

# API 代理
curl -s http://localhost/api/v1/sword/modules | head -50

# 注释源（应为 34 个）
curl -s http://localhost:8080/api/v1/annotations/commentary-sources | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Commentary sources: {len(d[\"sources\"])}')
"
```

---

## 三、电子书目录（35 本）

### 经典著作（31 本）

| 缩写 | 书名 | 作者 |
|------|------|------|
| Imitation | 效法基督 | Thomas à Kempis |
| Institutes | 基督教要义 | John Calvin |
| Pilgrim | 天路历程 | John Bunyan |
| DarkNightOfTheSoul | 灵魂黑夜 | St. John of the Cross |
| Practice | 与神同在 | Brother Lawrence |
| JEAffections | 宗教情感 | Jonathan Edwards |
| JESermons | 爱德华兹讲道集 | Jonathan Edwards |
| JOChrist | 基督论 | John Owen |
| JOCommGod | 与神交通 | John Owen |
| JOGlory | 基督的荣耀 | John Owen |
| JOMortSin | 治死罪 | John Owen |
| EMBReality | 祷告的真实 | E.M. Bounds |
| Finney | 芬尼讲道集 | Charles Finney |
| Heretics | 异端 | G.K. Chesterton |
| Orthodoxy | 正统 | G.K. Chesterton |
| Josephus | 约瑟夫全集 | Josephus |
| Summa | 神学大全 | Thomas Aquinas |
| Enoch | 以诺书 | — |
| Jubilees | 禧年书 | — |
| Passion | 主的受难 | — |
| Didache | 十二使徒遗训 | — |
| Concord | 协和书 | 路德宗 |
| Westminster | 威斯敏斯特信条 | — |
| Westminster21 | 威斯敏斯特信条（现代版） | — |
| BaptistConfession1646 | 浸信会信条 1646 | — |
| BaptistConfession1689 | 浸信会信条 1689 | — |
| LawGospel | 律法与福音 | C.F.W. Walther |
| JCRHoliness | 圣洁 | J.C. Ryle |
| MollColossians | 歌罗西书灵修 | Randy Moll |
| Phaistos | 费斯托斯盘 | — |
| alzat | Alzat yli opastus | (芬兰语) |

### 每日灵修（3 本）

| 缩写 | 书名 | 作者 |
|------|------|------|
| SME | 清晨甘露·静夜亮光 | C.H. Spurgeon |
| Daily | 每日灵粮 | Jonathan Bagster |
| DBD | 恩典日日新 | Bob Hoekstra |

### 论文（1 本）

| 缩写 | 书名 |
|------|------|
| ABS_Essay_GoodSam_SWB | Essays on The Good Samaritan |

---

## 四、本次修复的 Bug

### 图书馆阅读器无法下拉滚动

**根因**：`library.html` 引入了桌面版 `style.css`，其中 `body { height:100vh; overflow:hidden; }` 锁死了 body 滚动。

**修复**：`library.css` 中添加 `!important` 覆盖：
```css
html, body {
  margin: 0 !important;
  padding: 0 !important;
  height: auto !important;
  overflow-y: auto !important;
  background: var(--lib-bg) !important;
}
```

### 版本号
v=20260702a

---

## 五、文件大小汇总

| 组件 | 大小 |
|------|------|
| bible-monolith.jar | 75.3 MB |
| 前端文件（14 个） | 413 KB |
| SWORD 模块（新增 101 个目录） | 263 MB |
| **部署包总计** | **~339 MB** |

---

## 六、回滚方案

```bash
cd /opt/bible-microservices
pkill -f bible-monolith.jar
cp bible-monolith.jar.bak bible-monolith.jar
nohup java -Xms48m -Xmx256m -jar bible-monolith.jar > monolith.log 2>&1 &
```

---

## 七、systemd 自启动（可选）

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
