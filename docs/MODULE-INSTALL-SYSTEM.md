# 模块安装系统

## 架构概述

模块安装系统允许用户从多个 SWORD 仓库浏览、安装、卸载圣经模块。该系统完全兼容 CrossWire / AndBible 的 SWORD 仓库格式。

## 仓库配置

### 已配置的仓库 (5 个)

| ID | 名称 | 类型 | 说明 |
|----|------|------|------|
| `crosswire` | CrossWire Main | sword-https | 标准 SWORD 模块仓库 |
| `crosswire-beta` | CrossWire Beta | sword-https | Beta/预览版模块 |
| `crosswire-av11n` | CrossWire Av11n | sword-https | 替代分节模块 |
| `xmission` | XMission Mirror | sword-https | 北美镜像（更快） |
| `andbible` | AndBible | sword-https | AndBible 精选模块 |

### 仓库配置模型 (RepositoryInfo)

```kotlin
data class RepositoryInfo(
    val id: String,           // 唯一标识（用于 API 参数）
    val name: String,         // 显示名称
    val type: String,         // 类型（sword-https/sword-http）
    val host: String,         // 域名
    val packageDir: String,   // 模块 zip 包路径
    val catalogDir: String,   // mods.d.tar.gz 路径
    val description: String   // 描述
)
```

## 安装流程

```
┌──────────────────────────────────────────────────┐
│ 1. 用户选择仓库源 + 模块 → POST /install          │
└────────────────┬─────────────────────────────────┘
                 ▼
┌──────────────────────────────────────────────────┐
│ 2. 下载模块 zip 包                                │
│    URL: https://{host}{packageDir}/{module}.zip   │
│    保存到: sword-mods/_tmp_{module}.zip           │
└────────────────┬─────────────────────────────────┘
                 ▼
┌──────────────────────────────────────────────────┐
│ 3. 解压到 sword-mods/{module}/                    │
│    只提取 mods.d/ 和 modules/ 子目录              │
│    处理单目录嵌套（CrossWire 常见）               │
└────────────────┬─────────────────────────────────┘
                 ▼
┌──────────────────────────────────────────────────┐
│ 4. 注册到 JSword                                  │
│    swordRegistry.reloadModules()                  │
│    5 次重试 (500ms × 5) 等待 JSword 扫描          │
│    SwordBookDriver.registerNewBook()              │
└────────────────┬─────────────────────────────────┘
                 ▼
┌──────────────────────────────────────────────────┐
│ 5. 验证 + 完成                                    │
│    Books.installed().books.find() 确认            │
│    清除仓库缓存 (catalogCache)                    │
│    清理临时文件                                    │
│    返回 InstallResult                             │
└──────────────────────────────────────────────────┘
```

## 目录缓存机制

模块目录 (`mods.d.tar.gz`) 下载后缓存在内存中，避免重复下载：

```kotlin
private val catalogCache = mutableMapOf<String, List<AvailableModule>>()
```

**缓存失效时机**:
- 安装新模块后 (catalogCache.remove(repoId))
- 卸载模块后 (catalogCache.clear())
- 手动刷新 (API 参数 `refresh=true`)

## 模块目录解析

### mods.d.tar.gz 格式

gzip 压缩的 tar 包，内含 N 个 `.conf` 文件，每个代表一个模块：

```
mods.d.tar.gz
├── KJV.conf        → 模块名 "KJV"
├── ESV2011.conf    → 模块名 "ESV2011"
├── MHCC.conf       → 模块名 "MHCC"
└── ...
```

### .conf 文件解析

```kotlin
// 解析 Key=Value 行
// 反斜杠 \ 结尾表示续行
// 空行/注释行重置当前 key 解析

[KJV]
Description=King James Version (1769) with Strong's Numbers
ModDrv=zText
DataPath=./modules/texts/ztext/kjv/
SourceType=OSIS
Lang=en
Category=Biblical Text
```

## 模块分类检测

通过多级启发式检测模块分类：

```kotlin
fun detectCategory(name, props): String {
    // 1. 显式 Category 字段
    // 2. Description 关键词
    // 3. 已知模块名前缀匹配
    // 4. ModDrv 驱动类型回退
}
```

**已知前缀**:
- 注释: MHC, JFB, Clarke, Barnes, Calvin, Wesley, RWP, Scofield, TSK, PNT, TFG
- 词典: StrongsGreek, StrongsHebrew, ISBE, Easton, Nave, Hitchcock, Smith, Fausset
- 灵修: Daily, DCD, SME

## 下载 URL 解析

```kotlin
fun resolveDownloadUrl(repo, moduleName): String {
    // 1. 尝试小写: https://{host}{packageDir}/{moduleName}.zip
    // 2. 尝试大写: https://{host}{packageDir}/{MODULENAME}.zip
    //    (CrossWire 服务器使用混合大小写文件名, 如 SME.zip)
    // 3. 都不可用时返回小写 URL（让下载直接失败）
}
```

## 编码修复

SWORD .conf 规范使用 ISO-8859-1，但中文等非英语模块实际使用 UTF-8：

```kotlin
fun fixUtf8Mojibake(text: String): String {
    // 1. 全 ASCII → 无需修复
    // 2. 检查 UTF-8 多字节序列特征
    // 3. 有 UTF-8 特征 → Latin-1 → UTF-8 重编码
    // 4. 不含 \uFFFD 替换字符才接受结果
}
```

## API 端点

详见 [API-REFERENCE.md](./API-REFERENCE.md) 模块安装章节。

## 扩展：添加新仓库

详见 [SELF-HOSTED-REPO.md](./SELF-HOSTED-REPO.md)。

## 关键经验

1. **JSword 扫描延迟**: 模块注册后 JSword 需要 500ms-2.5s 扫描，需重试机制
2. **zip 文件名大小写**: CrossWire 服务器混合大小写，需 fallback 机制
3. **目录嵌套**: 部分 CrossWire zip 包含单层嵌套目录，需 flatten
4. **安装超时**: 前端 server.js 代理有 120s 超时限制
5. **线程安全**: 安装操作使用 synchronized 锁防止同一模块重复安装
6. **清理机制**: 安装完成 30s 后自动清理 activeInstalls 记录
