# Task: AndBible 源码分析 & JSword 编译 — 2026-06-04

## 目标
1. JSword 源码编译通过 → 集成到项目作为 SWORD 模块读取器
2. 下载分析 AndBible 源码 → 设计功能移植方案

## 结果

### JSword 编译 ✅
- 396 个 Java 文件编译通过 (`BUILD SUCCESSFUL`)
- 模块 `bible-sword-reader` 已加入 Gradle 构建
- 路径: `bible-sword-reader/src/main/java/org/crosswire/`

### AndBible 分析完成
- 21 项功能识别（7 已有、13 待移植、1 部分）
- 完整方案文档: `docs/andbible-integration-plan.md`
- 4 阶段实施计划，推荐新增 2 微服务
- 关键风险: JSword GPLv2 许可证污染

### KJV Strong's 模块下载
- nt.bzv/nt.bzs/nt.bzz 就绪
- 导入脚本已编写，待明日调试执行

## 下一步
1. 修复 BZS 格式解析（108 字节 = 27×4 块尺寸）
2. 执行 KJV 词级数据导入
3. 决定是否用 JSword 原生读取替代预导入
