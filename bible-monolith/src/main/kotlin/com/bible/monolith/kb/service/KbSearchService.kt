package com.bible.monolith.kb.service

import com.bible.monolith.kb.model.KbDocument
import com.bible.monolith.kb.repository.KbDocumentRepository
import com.bible.monolith.repository.BookRepository
import com.bible.monolith.repository.TranslationRepository
import com.bible.monolith.repository.VerseRepository
import com.bible.monolith.service.BibleSearchService
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

/**
 * Hybrid search service — combines vector search (Zvec) with keyword
 * search (Lucene) and metadata lookup for optimal results.
 *
 * Three channels:
 * 1. Vector: Zvec semantic similarity (model-dependent)
 * 2. Keyword: Lucene BM25 (model-independent, always available)
 * 3. Metadata: exact Bible reference parsing
 *
 * Fusion: weighted merge (0.5 vector + 0.3 keyword + 0.2 metadata)
 */
@Service
class KbSearchService(
    private val embeddingService: KbEmbeddingService,
    private val zvecBridge: ZvecBridge,
    private val docRepo: KbDocumentRepository,
    private val luceneSearch: BibleSearchService,
    private val verseRepo: VerseRepository,
    private val bookRepo: BookRepository,
    private val translationRepo: TranslationRepository
) {
    private val log = LoggerFactory.getLogger(KbSearchService::class.java)

    data class SearchRequest(
        val query: String,
        val modelId: String = "tfidf_256",
        val topK: Int = 10,
        val sourceTypes: Set<String>? = null,     // null = all
        val translation: String? = null,
        val module: String? = null,
        val bookCode: String? = null,
        val category: String? = null,
        val mode: String = "hybrid"                // hybrid | vector | keyword
    )

    data class SearchResult(
        val title: String,
        val snippet: String,
        val score: Float,
        val sourceType: String,
        val displayRef: String?,
        val module: String?,
        val moduleName: String?,
        val translation: String?,
        val book: String?,
        val bookName: String?,
        val chapter: Int?,
        val verseStart: Int?,
        val verseEnd: Int?,
        val bookCode: String?,
        val category: String?,
        val language: String?
    )

    data class SearchResponse(
        val query: String,
        val modelId: String,
        val mode: String,
        val tookMs: Long,
        val total: Int,
        val results: List<SearchResult>
    )

    /** Perform a hybrid search */
    fun search(req: SearchRequest): SearchResponse {
        val start = System.currentTimeMillis()
        log.info("KB search: '{}' model={} mode={}", req.query, req.modelId, req.mode)

        // 1. Check for Bible reference (e.g. "约3:16", "John 3:16")
        val refResults = if (req.mode == "hybrid") {
            tryBibleRefSearch(req.query, req)
        } else emptyList()
        log.debug("  Metadata channel: {} results", refResults.size)

        // 2. Vector search
        val vectorResults = if (req.mode == "hybrid" || req.mode == "vector") {
            vectorSearch(req)
        } else emptyList()
        log.debug("  Vector channel: {} results", vectorResults.size)

        // 3. Keyword search (Lucene)
        val keywordResults = if (req.mode == "hybrid" || req.mode == "keyword") {
            keywordSearch(req)
        } else emptyList()
        log.debug("  Keyword channel: {} results", keywordResults.size)

        // 4. Fuse results
        val fused = fuseResults(refResults, vectorResults, keywordResults, req.topK)

        val tookMs = System.currentTimeMillis() - start
        log.info("KB search complete: {} results in {}ms", fused.size, tookMs)

        return SearchResponse(
            query = req.query,
            modelId = req.modelId,
            mode = req.mode,
            tookMs = tookMs,
            total = fused.size,
            results = fused
        )
    }

    /** Compare results across all three models */
    fun compareModels(query: String, topK: Int, sourceTypes: Set<String>?): Map<String, SearchResponse> {
        val results = mutableMapOf<String, SearchResponse>()
        for (modelId in embeddingService.allModelIds) {
            try {
                results[modelId] = search(SearchRequest(
                    query = query,
                    modelId = modelId,
                    topK = topK,
                    sourceTypes = sourceTypes,
                    mode = "hybrid"
                ))
            } catch (e: Exception) {
                log.warn("Model {} comparison failed: {}", modelId, e.message)
            }
        }
        return results
    }

    // ─── Vector search ───

    private fun vectorSearch(req: SearchRequest): List<SearchResult> {
        // Embed the query
        val queryVec = embeddingService.embed(req.query, req.modelId)

        // Determine which collections to search
        val sourceTypes = req.sourceTypes ?: setOf("bible", "commentary", "dictionary", "devotion", "genbook", "library")
        val allResults = mutableListOf<SearchResult>()

        for (sourceType in sourceTypes) {
            val collection = embeddingService.collectionName(req.modelId, sourceType)
            val filters = buildFilters(req)

            try {
                val zvecResults = zvecBridge.search(collection, queryVec, req.topK * 2, filters)
                for (r in zvecResults) {
                    val meta = r.metadata
                    allResults.add(SearchResult(
                        title = meta["title"] as? String ?: "",
                        snippet = (meta["title"] as? String ?: "").take(200),
                        score = r.score,
                        sourceType = meta["source_type"] as? String ?: sourceType,
                        displayRef = meta["display_ref"] as? String,
                        module = meta["module"] as? String,
                        moduleName = meta["module_name"] as? String,
                        translation = meta["translation"] as? String,
                        book = meta["book"] as? String,
                        bookName = meta["book_name"] as? String,
                        chapter = (meta["chapter"] as? Number)?.toInt(),
                        verseStart = (meta["verse_start"] as? Number)?.toInt(),
                        verseEnd = (meta["verse_end"] as? Number)?.toInt(),
                        bookCode = meta["book_code"] as? String,
                        category = meta["category"] as? String,
                        language = meta["language"] as? String
                    ))
                }
            } catch (e: Exception) {
                log.debug("Vector search failed for {}/{}: {}", req.modelId, sourceType, e.message)
            }
        }

        return allResults.sortedByDescending { it.score }.take(req.topK * 2)
    }

    // ─── Keyword search (Lucene) ───

    /** Keyword search via Lucene */
    private fun keywordSearch(req: SearchRequest): List<SearchResult> {
        return try {
            val transCode = req.translation ?: "cuv_gb"
            val luceneResult = luceneSearch.search(req.query, transCode, 0, req.topK)
            @Suppress("UNCHECKED_CAST")
            val results = luceneResult["results"] as? List<Map<String, Any>> ?: emptyList()
            results.map { r ->
                val bookId = r["book_id"] as? String ?: ""
                val bookName = r["book_name"] as? String ?: ""
                val chapter = (r["chapter"] as? Number)?.toInt() ?: 0
                val verse = (r["verse"] as? Number)?.toInt() ?: 0
                val text = r["text"] as? String ?: ""
                val score = (r["score"] as? Number)?.toFloat() ?: 0f

                SearchResult(
                    title = "$bookName $chapter:$verse",
                    snippet = text.take(200),
                    score = score,
                    sourceType = "bible",
                    displayRef = "$bookName $chapter:$verse",
                    module = null,
                    moduleName = null,
                    translation = transCode,
                    book = bookId,
                    bookName = bookName,
                    chapter = chapter,
                    verseStart = verse,
                    verseEnd = verse,
                    bookCode = null,
                    category = null,
                    language = if (transCode.startsWith("chi") || transCode == "cuv_gb") "zh" else "en"
                )
            }
        } catch (e: Exception) {
            log.debug("Keyword search failed: {}", e.message)
            emptyList()
        }
    }

    // ─── Bible reference search ───

    private fun tryBibleRefSearch(query: String, req: SearchRequest): List<SearchResult> {
        // Parse patterns like "约3:16", "约翰福音3:16", "John 3:16", "Joh 3:16"
        val refPattern = Regex("""^(.+?)\s*(\d+)[\s:：]+(\d+)(?:[\s:：\-]+(\d+))?$""")
        val match = refPattern.find(query.trim()) ?: return emptyList()

        val bookName = match.groupValues[1]
        val chapter = match.groupValues[2].toIntOrNull() ?: return emptyList()
        val verseStart = match.groupValues[3].toIntOrNull() ?: return emptyList()
        val verseEnd = match.groupValues[4]?.toIntOrNull() ?: verseStart

        // Find the book
        val transCode = req.translation ?: "cuv_gb"
        val trans = translationRepo.findByCode(transCode) ?: return emptyList()
        val book = bookRepo.findByTranslationOrderByOrderIndex(trans).find {
            it.name.contains(bookName) || it.bookId.equals(bookName, ignoreCase = true) ||
            it.englishName.contains(bookName, ignoreCase = true)
        } ?: return emptyList()

        val verses = verseRepo.findByBookAndChapterAndVerseBetween(book, chapter, verseStart, verseEnd)

        if (verses.isEmpty()) return emptyList()

        val text = verses.joinToString(" ") { it.text }
        val displayRef = "${book.name} ${chapter}:${if (verseStart == verseEnd) verseStart.toString() else "$verseStart-$verseEnd"}"

        return listOf(SearchResult(
            title = "$displayRef (${trans.code})",
            snippet = text.take(300),
            score = 1.0f,
            sourceType = "bible",
            displayRef = displayRef,
            module = null,
            moduleName = null,
            translation = trans.code,
            book = book.bookId,
            bookName = book.name,
            chapter = chapter,
            verseStart = verseStart,
            verseEnd = verseEnd,
            bookCode = null,
            category = null,
            language = if (transCode.startsWith("chi") || transCode == "cuv_gb") "zh" else "en"
        ))
    }

    // ─── Fusion ───

    private fun fuseResults(
        metadata: List<SearchResult>,
        vector: List<SearchResult>,
        keyword: List<SearchResult>,
        topK: Int
    ): List<SearchResult> {
        // Weighted score map (by title for dedup)
        val scoreMap = mutableMapOf<String, Float>()
        val resultMap = mutableMapOf<String, SearchResult>()

        // Metadata: weight 0.2
        for (r in metadata) {
            val key = r.title
            scoreMap[key] = (scoreMap[key] ?: 0f) + r.score * 0.2f
            resultMap[key] = r
        }

        // Vector: weight 0.5
        for (r in vector) {
            val key = r.title
            scoreMap[key] = (scoreMap[key] ?: 0f) + r.score * 0.5f
            if (key !in resultMap) resultMap[key] = r
        }

        // Keyword: weight 0.3
        for (r in keyword) {
            val key = r.title
            scoreMap[key] = (scoreMap[key] ?: 0f) + r.score * 0.3f
            if (key !in resultMap) resultMap[key] = r
        }

        return scoreMap.entries
            .sortedByDescending { it.value }
            .take(topK)
            .map { e ->
                resultMap[e.key]!!.copy(score = e.value)
            }
    }

    // ─── Filters ───

    private fun buildFilters(req: SearchRequest): Map<String, Any> {
        val filters = mutableMapOf<String, Any>()
        req.translation?.let { filters["translation"] = it }
        req.module?.let { filters["module"] = it }
        req.bookCode?.let { filters["book_code"] = it }
        req.category?.let { filters["category"] = it }
        return filters
    }
}
