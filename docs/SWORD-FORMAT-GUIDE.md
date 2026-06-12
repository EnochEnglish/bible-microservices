# SWORD 模块格式完全指南

## 概述

SWORD 项目 (CrossWire) 定义了多种模块格式用于存储圣经文本、注释、词典等。所有格式均使用纯二进制文件，通过 .conf 配置文件描述元数据。

## 模块结构

每个 SWORD 模块是一个目录：
`
{ModuleName}/
├── mods.d/
│   └── {modulename}.conf    # 模块元数据
└── modules/
    └── {datapath}/
        ├── {prefix}.bzs     # Block index (压缩块索引)
        ├── {prefix}.bzv     # Verse index (经文索引)
        └── {prefix}.bzz     # Compressed data (压缩数据块)
`

## 格式分类

### 1. zText — 经文格式

**用途**: 圣经译本
**ModDrv**: zText
**文件**: .bzs, .bzv, .bzz

**BZS (Block Index)** — 每条目 12 字节:
`
Offset  Size  Field
0       4     blockStart (uint32 LE) — 压缩块在 .bzz 中的起始偏移
4       4     compressedSize (uint32 LE)
8       4     uncompressedSize (uint32 LE)
`

**BZV (Verse Index)** — 每条目 10 字节:
`
Offset  Size  Field
0       4     blockNum (uint32 LE) — 对应 BZS 块的索引
4       4     verseStart (uint32 LE) — 解压后数据中的偏移
8       2     verseSize (uint16 LE)
`

**压缩**: zlib (DEFLATE)

**重要发现**: JSword 源码中的变量命名与直觉相反：
- getCompRaf() → 实际打开 .bzs (block index)
- getIdxRaf() → 实际打开 .bzv (verse index)
- getTextRaf() → 实际打开 .bzz (压缩数据)

**字节序**: Little-Endian（实测，非文档所述 Big-Endian）

### 2. zCom / zCom4 — 注释格式

**用途**: 注释、解经书
**ModDrv**: zCom 或 zCom4

**zCom**: 旧格式，使用 LZSS 压缩（非 zlib）
**zCom4**: 新格式，标准 zlib 压缩

**索引规律**:
- zCom4: BZS 索引的 0, 3, 6, ... 位置为有效 zlib 块
- BZV: (offset:uint32, key:uint32) 配对

**注释引用格式** (annotateRef):
- "Bible:Exod.1.1" — Calvin 风格
- "Matt.2.1" — Catena 风格
- passage="Matt 1" — Barnes 风格

### 3. RawLD / zLD — 词典格式

**用途**: 词典、百科全书
**ModDrv**: RawLD (无压缩) 或 zLD (压缩)

**zLD 结构 (两层)**:
`
主索引文件 (.zdx):
  [subBlockOffset: uint32 LE, ...]

子索引文件 (.zdt):
  [key_offset: uint32 LE, key_size: uint32 LE, ...]
`

**RawLD 结构**:
`
.idx 文件: [offset: uint32 LE, size: uint32 LE] × N
.dat 文件: 纯文本条目（UTF-8/ISO-8859-1）
`

### 4. RawGenBook — 通用书格式

**用途**: 灵修书、通用书籍
**ModDrv**: RawGenBook

**结构**: 树形键结构
`
{module}/
├── (root key)/
│   ├── (child key)/
│   │   └── (leaf content)
`

**灵修模块 (Category=Daily Devotion)**:
- 顶级键: 月份 (01-12)
- 子键: 日期 (01-31)
- 内容: OSIS XML 格式的灵修文章

### 5. RawText — 原始文本格式

**用途**: 无压缩的经文格式
**ModDrv**: RawText

**结构**:
- .vss 文件: 纯文本，每行一节经文
- 支持 OSIS/IMP/ThML 标记

## .conf 文件格式

SWORD 配置文件使用简单的 Key=Value 格式：
`ini
[模块名]
Description=模块描述
About=详细说明
ModDrv=zText
DataPath=./modules/texts/ztext/kjv/
SourceType=OSIS
Lang=en
Version=1.0
Category=Biblical Text
LCSH=Bible. English.
`

**重要**: .conf 编码规范为 ISO-8859-1，但中文学等非英语模块实际使用 UTF-8。解析时需要 mojibake 修复（Latin-1 → UTF-8 重编码检测）。

## 目录结构 (mods.d.tar.gz)

CrossWire 仓库的模块目录是一个 gzip 压缩的 tar 包：
`
mods.d.tar.gz
├── KJV.conf
├── ESV2011.conf
├── ChiUns.conf
├── StrongsGreek.conf
├── MHCC.conf
├── SME.conf
└── ... (425+ 个 .conf 文件)
`

每个 .conf 文件对应一个可安装模块。

## 压缩算法总结

| 格式 | 索引 | 数据 | 压缩 |
|------|------|------|------|
| zText | BZS(12B) + BZV(10B) | BZZ | zlib |
| zCom4 (新) | BZS(8B) + BZV(8B) | BZZ | zlib (选中块) |
| zCom (旧) | BZS + BZV | BZZ | LZSS |
| RawLD | IDX(8B) | DAT | 无 |
| zLD | ZDX + ZDT | 内嵌 | zlib |
| RawGenBook | 树形目录 | 文件 | 无 |

## 与 JSword 的兼容性

本项目的 ible-sword-service 使用 JSword 库进行所有格式解析，因此：
- 完全兼容 CrossWire 所有模块格式
- 无需自行实现压缩/解压逻辑
- 模块安装后自动识别格式并加载

## 关键经验教训

1. **字节序陷阱**: SWORD 文档声称 Big-Endian，实测为 Little-Endian
2. **JSword 变量命名混淆**: getCompRaf → .bzs, getIdxRaf → .bzv
3. **zCom vs zCom4**: zCom 使用 LZSS，不可与 zlib 混用
4. **中文编码**: .conf 和内容文件的实际编码可能不是 ISO-8859-1
5. **LuceneIndexManager 缺失**: JSword Books.<clinit> 需要此依赖，需 stub 解决