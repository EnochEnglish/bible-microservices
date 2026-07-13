# 知识库方案优化分析：当前方案 vs 优化建议

## 数据规模

| 指标 | 数值 |
|------|------|
| 书籍数 | 95 本 |
| 章节数 | 946 章 |
| 总字数 | 940 万字 |
| 平均每章 | 9,936 字 |
| 最短章节 | 210 字 |
| 最长章节 | 440,868 字 |
| 磁盘占用 | 21.1 MB (JSON) |

**分布**：<500字 53章 | 500-2000字 267章 | 2000-5000字 218章 | >5000字 408章

---

## 当前方案（已设计）

| 环节 | 当前方案 | 说明 |
|------|----------|------|
| **分块策略** | 按章节自然边界分块，每块 300-500 字，重叠 50 字 | 利用已有章节结构，不做语义分块 |
| **嵌入模型** | 本地 TF-IDF 哈希嵌入（768 维） | 中文 bigram + 英文分词 → 哈希到固定维度 → L2 归一化 |
| **嵌入依赖** | 零外部依赖，纯 Kotlin/JS 实现 | 不接入任何大模型或外部 API |
| **向量数据库** | Zvec（阿里开源，Node.js SDK） | 进程内嵌入，合并到现有前端 Node 进程（端口 3000） |
| **索引类型** | Zvec 默认（HNSW） | 946 章规模下默认参数足够 |
| **查询方式** | 纯向量相似度搜索（cosine） | 无关键词搜索、无混合检索 |
| **排序方式** | Zvec 返回的 cosine 相似度分数 | 无重排序 |
| **元数据过滤** | sourceType / category / bookCode | H2 SQL 过滤后再送 Zvec 检索 |
| **缓存** | 无 | 每次查询重新计算嵌入向量 |
| **RAG** | 无 | 明确不接入大模型生成 |

---

## 逐项对照分析

### 一、文本分块

| 优化建议 | 当前方案 | 评估与改进 |
|----------|----------|------------|
| **语义分块代替固定长度** | 按章节边界 + 300-500字滑窗 | ⚠️ **部分采纳**：当前已按章节边界分块（比纯固定长度好），但章内切分仍是固定长度。改进：在句号/段落边界处断开，不做硬截断 |
| **滑动窗口 Overlap** | 50 字重叠（约 10%） | ✅ **已采用** |
| **元数据标签** | sourceType/sourceRef/bookCode/chapterId/category/language | ✅ **已采用**，支持精确过滤 |
| **父子文档模式** | 无 | 🔧 **可采纳**：小块（300字）用于检索，命中后返回所属整章作为上下文。当前 `kb_document` 表已有 `chunk_index` 字段，可通过 `source_ref` 关联同章所有块 |

**改进方案**：
```
分块逻辑改为：
1. 按章节边界切分（已有）
2. 章内按段落（\n\n）切分
3. 段落 > 500 字时按句号切分
4. 每块 300-500 字，重叠 50 字
5. 存储 chunk_text（小块，用于检索）+ parent_text（整段，用于展示）
```

### 二、嵌入模型

| 优化建议 | 当前方案 | 评估与改进 |
|----------|----------|------------|
| **更换更强的基础模型** | 本地 TF-IDF 哈希 | ⚠️ **关键瓶颈**：TF-IDF 哈希只能捕获词频共现，无法理解语义。搜"祷告"无法召回"祈求" |
| **模型量化与推理加速** | 无模型，纯哈希计算 | ✅ **不需要**：哈希嵌入本身就是最快方案 |
| **降低向量维度** | 768 维 | 🔧 **可调整**：946 章规模下 256 维足够，减少存储和计算 |
| **缓存查询向量** | 无 | ✅ **可采纳**：简单 LRU 缓存，避免重复嵌入相同查询 |

**改进方案（分阶段）**：

```
阶段1（当前）：本地 TF-IDF 哈希嵌入
  - 优点：零依赖、零成本、毫秒级
  - 缺点：无法捕获同义语义
  - 适用：验证全链路流程

阶段2（可选）：本地 Sentence-BERT 模型
  - 模型：shibing624/text2vec-base-chinese（中文语义）
  - 部署：Node.js + ONNX Runtime（CPU 量化 INT8）
  - 向量维度：256 或 512
  - 优点：真正理解"祷告"≈"祈求"≈"呼求"
  - 成本：模型 ~90MB，推理 ~50ms/query

阶段3（可选）：外部 Embedding API
  - 预留接口：EmbeddingProvider
  - 模型：BAAI/bge-large-zh-v1.5 或 text-embedding-3-small
  - 优点：最高精度
  - 成本：需 API Key + 网络
```

### 三、索引构建

| 优化建议 | 当前方案 | 评估与改进 |
|----------|----------|------------|
| **选择 ANN 索引类型** | HNSW（Zvec 默认） | ✅ **已采用**：946 章规模下 HNSW 最优，召回率高 |
| **分批/批量插入** | 计划批量索引 | ✅ **已采用**：每批 500 条 |
| **合理利用持久化** | Zvec WAL | ✅ **已采用**：全部插入后显式 flush |
| **向量保留在内存** | Zvec 进程内 | ✅ **已采用**：946 章向量约 2.8MB（768维×4字节×946），完全内存 |

**结论**：索引层面当前方案已经合理，946 章的规模对 Zvec 来说轻而易举。

### 四、查询与排序

| 优化建议 | 当前方案 | 评估与改进 |
|----------|----------|------------|
| **混合搜索** | 纯向量搜索 | 🔧 **强烈建议采纳**：现有后端已有 Lucene 全文索引（bible-search-service），可复用 |
| **查询增强（HyDE）** | 无 | ❌ **不采纳**：需要 LLM 生成假设性文档，违反"不接入大模型"约束 |
| **检索后重排序** | 无 | 🔧 **可采纳阶段2**：交叉编码器重排序，但需额外模型文件 |

**改进方案——混合搜索（重点）**：

```
当前流程：
  用户查询 → 嵌入 → Zvec 向量搜索 → 返回 topK

改进流程（混合搜索）：
  用户查询 → 双通道并行：
    ├─ 通道A：Zvec 向量搜索 → top 30 候选
    └─ 通道B：Lucene 关键词搜索 → top 30 候选
  → 合并去重 → 加权融合（0.7×向量分数 + 0.3×关键词分数）
  → 返回 top 10
```

**优势**：
- 向量搜索捕获语义相似（"祷告" ↔ "祈求"）
- 关键词搜索捕获精确匹配（搜"因信称义"能命中确切含这四个字的段落）
- 后端已有 Lucene 全文索引基础设施，改造成本低

### 五、工程与链路

| 优化建议 | 当前方案 | 评估与改进 |
|----------|----------|------------|
| **多级缓存** | 无 | ✅ **可采纳**：查询结果 LRU 缓存（1000 条），重复查询零延迟 |
| **并行处理** | 单线程嵌入 | ✅ **可采纳**：索引构建时 Node.js worker_threads 并行嵌入 |
| **前端本地化与渐进加载** | 预索引 + 启动加载 | ✅ **已采用**：Zvec WAL 持久化，启动时直接加载 |
| **定期评估检索质量** | 无 | ✅ **可采纳**：构建 100 条标准问答对，定期回归测试 |

---

## 优化后的完整方案

### 架构图

```
用户查询 "如何祷告"
    │
    ├──→ [缓存检查] ──命中──→ 返回缓存结果
    │         │
    │       未命中
    │         ↓
    ├──→ [嵌入] TF-IDF 哈希 → 768维向量
    │
    ├──→ [双通道搜索]
    │    ├─ Zvec 向量搜索 → top 30（语义相似）
    │    └─ Lucene 关键词 → top 30（精确匹配）
    │         │
    │         ↓
    ├──→ [融合排序] 0.7×向量 + 0.3×关键词 → 去重 → top 50
    │         │
    │         ↓
    ├──→ [元数据过滤] sourceType / category / bookCode
    │         │
    │         ↓
    ├──→ [返回 top 10] + 写入缓存
    │
    └──→ 前端渲染结果（高亮 + snippet + 来源链接）
```

### 分块改进

```
原始章节 (平均 9936 字)
    ↓
按段落 \n\n 切分
    ↓
段落 > 500字? → 按句号 。切分 → 每块 300-500 字
段落 ≤ 500字? → 整段作为一个块
    ↓
相邻块重叠 50 字
    ↓
每块存储：
  - chunk_text: 小块文本（用于向量检索）
  - chunk_index: 块序号
  - source_ref: 来源引用（book_code/chapter_id）
  - parent_ref: 父段落 ID（关联同章所有块）
  - metadata: { bookCode, category, title, language }
```

### 混合搜索实现

```kotlin
// KbService.kt — 混合搜索
fun hybridSearch(query: String, topK: Int = 10, filters: SearchFilters): List<SearchResult> {
    // 1. 双通道并行
    val vectorResults = async { 
        zvecBridge.search(queryEmbedding, topK * 3, filters) 
    }
    val keywordResults = async { 
        luceneSearch(query, topK * 3, filters) 
    }
    
    // 2. 合并去重 + 加权融合
    val allCandidates = mutableMapOf<String, SearchResult>()
    
    vectorResults.await().forEach { r ->
        allCandidates[r.docId] = r.copy(score = r.score * 0.7f)
    }
    
    keywordResults.await().forEach { r ->
        val existing = allCandidates[r.docId]
        if (existing != null) {
            allCandidates[r.docId] = existing.copy(score = existing.score + r.score * 0.3f)
        } else {
            allCandidates[r.docId] = r.copy(score = r.score * 0.3f)
        }
    }
    
    // 3. 排序 + 截取
    return allCandidates.values
        .sortedByDescending { it.score }
        .take(topK)
}
```

### 缓存实现

```kotlin
// 简单 LRU 缓存，1000 条容量
class QueryCache(maxSize: Int = 1000) {
    private val cache = object : LinkedHashMap<String, List<SearchResult>>(maxSize, 0.75f, true) {
        override fun removeEldestEntry(eldest: Map.Entry<String, List<SearchResult>>): Boolean {
            return size > maxSize
        }
    }
    
    fun get(query: String, filters: SearchFilters): List<SearchResult>? {
        return cache[cacheKey(query, filters)]
    }
    
    fun put(query: String, filters: SearchFilters, results: List<SearchResult>) {
        cache[cacheKey(query, filters)] = results
    }
    
    private fun cacheKey(query: String, filters: SearchFilters): String {
        return "$query|${filters.sourceType}|${filters.category}|${filters.bookCode}"
    }
}
```

---

## 实施优先级

| 优先级 | 优化项 | 改动量 | 效果 |
|--------|--------|--------|------|
| **P0** | 分块改进：段落+句号边界 | 小 | 召回质量 ↑ |
| **P0** | 元数据过滤 | 已有 | 精确度 ↑ |
| **P1** | 混合搜索（Zvec + Lucene） | 中 | 检准率 ↑↑ |
| **P1** | 查询缓存（LRU 1000） | 小 | 重复查询 0ms |
| **P2** | 父子文档模式 | 小 | 上下文完整性 ↑ |
| **P2** | 向量维度降到 256 | 小 | 存储/计算 ↓ |
| **P3** | 本地 Sentence-BERT 模型 | 大 | 语义理解 ↑↑↑ |
| **P3** | 交叉编码器重排序 | 大 | 精确度 ↑ |
| **P4** | 标准问答对回归测试 | 中 | 质量保障 |

**建议路径**：先按当前方案落地全链路（TF-IDF 哈希 + Zvec），验证可用后立即加 P0+P1（分块改进 + 混合搜索 + 缓存），这些改动成本低但效果显著。P3 的模型升级作为未来可选增强。

---

## 与建议的核心差异总结

| 维度 | 建议方案 | 当前方案 | 差异原因 |
|------|----------|----------|----------|
| 嵌入模型 | BGE/Sentence-BERT | TF-IDF 哈希 | 不接入大模型约束，先跑通再升级 |
| 混合搜索 | whoosh + Zvec | 纯 Zvec | **应采纳**——后端已有 Lucene |
| HyDE 查询增强 | LLM 生成假设文档 | 无 | 不接入大模型 |
| 重排序 | 交叉编码器 | 无 | 阶段2可选 |
| 模型量化 | ONNX INT8 | 不需要 | 哈希嵌入无需量化 |
| 向量维度 | 降到 256 | 768 | 可调整，946 章规模 256 够用 |
| 缓存 | 多级缓存 | 无 | **应采纳**——简单高效 |
| 语义分块 | RecursiveCharacterTextSplitter | 章节+固定长度 | **应改进**——段落+句号边界 |
| 父子文档 | 小块检索+大块上下文 | 无 | **可采纳**——提升体验 |
