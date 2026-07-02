# 中文 SWORD 模块安装 — 2026-07-01

## 目标
安装 CrossWire 上所有中文 SWORD 模块，确认中文电子书可用性。

## 结论：CrossWire 无中文电子书
CrossWire/SWORD 仓库中**没有**中文 GENERAL_BOOK、DAILY_DEVOTIONS 或 ESSAYS 模块。所有中文模块都是圣经译本或词典。

## 新安装的 3 个中文圣经译本

| 缩写 | 名称 | 语言 | 大小 | 说明 |
|------|------|------|------|------|
| ChiNCVt | 中文新译本（繁体） | zh-Hant | 1.6 MB | 环球圣经公会版 |
| ChiSB | 思高圣经 | zh-Hant | 1.7 MB | 天主教思高圣经学会译本 |
| ChiUnL | 深文理和合本 | lzh | 1.0 MB | 1923年文言文和合本 |

## 安装前已有 10 个中文模块

### 圣经译本（3个→现在6个）
| 缩写 | 名称 | 语言 |
|------|------|------|
| ChiUns | 和合本简体 | zh |
| ChiUn | 和合本繁体 | zh |
| ChiNCVs | 新译本简体 | zh |
| **ChiNCVt** | **新译本繁体** | **zh-Hant** ← 新安装 |
| **ChiSB** | **思高圣经** | **zh-Hant** ← 新安装 |
| **ChiUnL** | **深文理和合本** | **lzh** ← 新安装 |

### 词典（7个，未变）
| 缩写 | 名称 | 说明 |
|------|------|------|
| ChisStrongsGreek | CBOL 希腊文 Strong's 词典（简体） | Strong's G编号词典 |
| ChitStrongsGreek | CBOL 希腊文 Strong's 词典（繁体） | 同上繁体版 |
| ChisStrongsHebrew | CBOL 希伯来文 Strong's 词典（简体） | Strong's H编号词典 |
| ChitStrongsHebrew | CBOL 希伯来文 Strong's 词典（繁体） | 同上繁体版 |
| ZhEnglish | 中英词典 | 中文→英文翻译 |
| ZhHanzi | 汉英词典 | 汉字→英文翻译 |
| ZhPinyin | 拼音词典 | 拼音→英文翻译 |

## 这些模块的用途

### 圣经译本（6个）
- 在圣经阅读界面选择不同中文译本对照阅读
- 和合本(简/繁)、新译本(简/繁)、思高圣经、深文理和合本
- **不是电子书**——它们是圣经文本，通过圣经阅读界面使用

### 词典（7个）
- **Strong's 词典（CBOL版）**：在 Interlinear 逐词对照模式中，点击 Strong's 编号查看中文释义
- **中英/汉英/拼音词典**：通过词典面板搜索，输入英文查中文，或输入汉字/拼音查英文
- **不是电子书**——它们是工具词典，通过词典面板使用

## 能否用作电子书？
**不能。** 这 13 个中文模块的用途：
- 6 个圣经译本 → 圣经阅读界面选择译本
- 4 个 Strong's 词典 → 逐词对照 + Strong's 查询
- 3 个中英词典 → 词典面板搜索

它们都不是 GENERAL_BOOK 类型，无法在图书馆页面显示。

## 获取中文电子书的方法
如需中文基督教经典电子书（如《荒漠甘泉》《馨香的花束》等），需要：
1. **自建 SWORD GenBook 模块**：将 TXT/EPUB 格式的中文书籍用 SWORD 工具转为 GenBook 格式
2. **手动放入** `data/sword-mods/` 目录
3. 重启 monolith 自动加载

## 总模块数变化
- 安装前：123
- 安装后：126
- 新增：3 个中文圣经译本

## 验证
- ChiNCVt Gen 1:1 ✅ 可读
- ChiSB Gen 1:1 ✅ 可读（思高圣经）
- ChiUnL Gen 1:1 ✅ 可读（深文理和合本）
- ZhEnglish 词典查 "God" ✅ 返回中文翻译
- ZhPinyin 词典查 "shang" ✅ 返回中文词条
