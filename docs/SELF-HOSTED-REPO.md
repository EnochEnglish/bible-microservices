# 自建 SWORD 模块仓库指南

## 概述

本指南教你如何创建自己的 SWORD 模块仓库，支持：
- 完整镜像 CrossWire 官方仓库
- 创建本地文件夹仓库（离线/局域网使用）
- 发布自定义/私有模块
- 将自定义仓库添加到 Bible Microservices 的模块管理器

## 仓库架构

一个 SWORD 兼容仓库由两部分组成：

`
仓库根 URL (如 https://your-server.com/sword-repo/)
├── mods.d.tar.gz          ← 模块目录（必需）
└── packages/
    └── rawzip/
        ├── KJV.zip        ← 模块安装包
        ├── ESV2011.zip
        ├── MyModule.zip   ← 你的自定义模块
        └── ...
`

### 1. mods.d.tar.gz — 模块目录

一个 gzip 压缩的 tar 包，内含所有可用模块的 .conf 文件。

**生成方式**:
`ash
# 收集所有 .conf 文件到 mods.d/ 目录
mkdir mods.d
cp /path/to/modules/*/mods.d/*.conf mods.d/

# 打包
tar -czf mods.d.tar.gz mods.d/
`

### 2. packages/rawzip/ — 模块安装包

每个模块对应一个 .zip 文件，内含完整的模块目录结构：
`
MyModule.zip
├── mods.d/
│   └── mymodule.conf
└── modules/
    └── ...
`

## 方案一：创建本地文件夹仓库

适用于离线环境或局域网共享。

### 步骤

#### 1. 创建仓库目录结构
`powershell
mkdir D:\my-sword-repo
mkdir D:\my-sword-repo\mods.d
mkdir D:\my-sword-repo\packages\rawzip
`

#### 2. 放入模块的 .conf 文件
`powershell
# 从已安装的模块复制 .conf
copy D:\dev\github\bible-microservices\data\sword-mods\KJV\mods.d\kjv.conf D:\my-sword-repo\mods.d\
copy D:\dev\github\bible-microservices\data\sword-mods\ESV2011\mods.d\esv2011.conf D:\my-sword-repo\mods.d\
`

#### 3. 生成 mods.d.tar.gz
`powershell
# 使用 PowerShell 创建 tar.gz（需要 tar 命令，Windows 10+ 内置）
cd D:\my-sword-repo
tar -czf mods.d.tar.gz mods.d\
`

#### 4. 打包模块 zip 文件
`powershell
# 对每个模块打包
cd D:\dev\github\bible-microservices\data\sword-mods\KJV
tar -czf D:\my-sword-repo\packages\rawzip\KJV.zip mods.d\ modules\

# 或用 PowerShell Compress-Archive
Compress-Archive -Path "D:\dev\github\bible-microservices\data\sword-mods\KJV\*" -DestinationPath "D:\my-sword-repo\packages\rawzip\KJV.zip"
`

#### 5. 启动本地 HTTP 服务器
`powershell
# 使用 Python
cd D:\my-sword-repo
python -m http.server 9999

# 或用 npx serve
npx serve D:\my-sword-repo -p 9999
`

#### 6. 注册到 Bible Microservices

编辑 ible-sword-service/src/main/kotlin/com/bible/sword/service/ModuleInstallService.kt，在 epositories 列表中添加：

`kotlin
RepositoryInfo(
    id = "local",
    name = "本地仓库",
    type = "sword-http",
    host = "localhost:9999",
    packageDir = "/packages/rawzip",
    catalogDir = "",
    description = "本地 SWORD 模块仓库"
)
`

重新编译并启动 sword-service 后，UI 中将出现"本地仓库"选项。

## 方案二：镜像 CrossWire 仓库

### 只镜像需要的模块（推荐）

`powershell
# 创建镜像目录
mkdir D:\crosswire-mirror
mkdir D:\crosswire-mirror\packages\rawzip

# 下载模块目录
Invoke-WebRequest -Uri "https://crosswire.org/ftpmirror/pub/sword/raw/mods.d.tar.gz" 
    -OutFile "D:\crosswire-mirror\mods.d.tar.gz"

# 下载需要的模块（示例）
 = @("KJV", "ESV2011", "ChiUns", "StrongsGreek", "MHCC", "SME")
foreach ( in ) {
     = "https://crosswire.org/ftpmirror/pub/sword/packages/rawzip/.zip"
    Invoke-WebRequest -Uri  -OutFile "D:\crosswire-mirror\packages\rawzip\.zip"
}
`

### 全量镜像（约 5-10GB）

`powershell
# 使用 wget 递归下载
wget -r -np -nH --cut-dirs=3 -P D:\crosswire-mirror 
    https://crosswire.org/ftpmirror/pub/sword/packages/rawzip/

# 下载目录
wget -O D:\crosswire-mirror\mods.d.tar.gz 
    https://crosswire.org/ftpmirror/pub/sword/raw/mods.d.tar.gz
`

## 方案三：从零创建自定义模块

### 最小模块结构
`
MyBible/
├── mods.d/
│   └── mybible.conf
└── modules/
    └── texts/
        └── rawtext/
            └── mybible/
                ├── ot.vss    ← 旧约经文
                └── nt.vss    ← 新约经文
`

### .conf 文件模板
`ini
[MyBible]
Description=我的中文译本
About=基于公开领域译本的自定义版本
ModDrv=RawText
DataPath=./modules/texts/rawtext/mybible/
SourceType=OSIS
Encoding=UTF-8
Lang=zh
Version=1.0
Category=Biblical Text
LCSH=Bible. Chinese.
`

### .vss 文件格式 (RawText)
`
 1:1
起初，神创造天地。
 1:2
地是空虚混沌，渊面黑暗；神的灵运行在水面上。
 1:3
神说："要有光"，就有了光。
`

**规则**:
- $BookName Chapter:Verse 标记每节开始
- 经文内容可以多行
- 支持 OSIS/ThML 标记

### 打包安装
`powershell
# 打包
Compress-Archive -Path "D:\my-modules\MyBible\*" -DestinationPath "mybible.zip"

# 放入仓库
copy mybible.zip D:\my-sword-repo\packages\rawzip\MyBible.zip
copy D:\my-modules\MyBible\mods.d\mybible.conf D:\my-sword-repo\mods.d\
cd D:\my-sword-repo
tar -czf mods.d.tar.gz mods.d\
`

## 仓库注册完整示例

编辑 ModuleInstallService.kt:

`kotlin
val repositories = listOf(
    // 原有仓库...
    
    // 自定义：本地文件夹仓库
    RepositoryInfo(
        id = "local",
        name = "本地仓库 (Local)",
        type = "sword-http",
        host = "localhost:9999",
        packageDir = "/packages/rawzip",
        catalogDir = "",
        description = "本地 SWORD 模块仓库"
    ),
    
    // 自定义：局域网仓库
    RepositoryInfo(
        id = "lan",
        name = "局域网仓库 (LAN)",
        type = "sword-http",
        host = "192.168.1.100:8080",
        packageDir = "/sword/packages/rawzip",
        catalogDir = "/sword",
        description = "局域网共享的 SWORD 模块仓库"
    ),
    
    // 自定义：GitHub Releases 仓库
    RepositoryInfo(
        id = "my-github",
        name = "我的 GitHub 仓库",
        type = "sword-https",
        host = "github.com",
        packageDir = "/YourName/sword-modules/releases/download/v1.0",
        catalogDir = "/YourName/sword-modules/raw/main",
        description = "GitHub 托管的 SWORD 模块"
    )
)
`

## 同步前端 UI

更新 rontend/index.html 的模块源选择器：

`html
<select id="modulesSourceSelect" onchange="switchSource(this.value)">
    <option value="crosswire">🌐 CrossWire Main</option>
    <option value="crosswire-beta">🧪 CrossWire Beta</option>
    <option value="crosswire-av11n">📐 CrossWire Av11n</option>
    <option value="xmission">🇺🇸 XMission Mirror</option>
    <option value="andbible">📱 AndBible</option>
    <option value="local">💻 本地仓库</option>
    <option value="lan">🏠 局域网仓库</option>
    <option value="my-github">📦 我的 GitHub</option>
</select>
`

并在 pp.js 中添加 switchSource 函数：

`javascript
function switchSource(sourceId) {
    modulesState.source = sourceId;
    loadAvailableModules();
}
`

## 验证仓库

`powershell
# 测试目录可访问
curl http://localhost:9999/mods.d.tar.gz -o test.tar.gz

# 测试模块下载
curl http://localhost:9999/packages/rawzip/MyBible.zip -o test.zip

# 通过 API 验证
curl "http://localhost:8086/api/v1/sword/install/available?source=local"
`

## 仓库 URL 模式参考

| 仓库类型 | host | catalogDir | packageDir |
|---------|------|-----------|------------|
| CrossWire Main | crosswire.org | /ftpmirror/pub/sword/raw | /ftpmirror/pub/sword/packages/rawzip |
| CrossWire Beta | crosswire.org | /ftpmirror/pub/sword/betaraw | /ftpmirror/pub/sword/betapackages/rawzip |
| CrossWire Av11n | crosswire.org | /ftpmirror/pub/sword/avraw | /ftpmirror/pub/sword/avpackages/rawzip |
| AndBible | raw.githubusercontent.com | /AndBible/and-bible/develop/.gie/and-bible-data | /AndBible/and-bible/develop/.gie/and-bible-data/rawzip |
| 本地 HTTP | localhost:9999 | (留空) | /packages/rawzip |
| GitHub Raw | raw.githubusercontent.com | /User/Repo/main | /User/Repo/main/packages/rawzip |

**注意**: catalogDir 留空时，系统期望 mods.d.tar.gz 位于仓库根路径。