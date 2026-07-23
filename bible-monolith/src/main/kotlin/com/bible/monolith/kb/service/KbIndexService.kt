package com.bible.monolith.kb.service

import com.bible.monolith.kb.embedding.EmbeddingProvider
import com.bible.monolith.kb.model.KbDocument
import com.bible.monolith.kb.repository.KbDocumentRepository
import com.bible.monolith.model.Verse
import com.bible.monolith.repository.VerseRepository
import com.bible.monolith.repository.BookRepository
import com.bible.monolith.repository.TranslationRepository
import com.bible.monolith.service.SwordCommentaryService
import com.bible.monolith.service.DictionaryService
import com.bible.monolith.service.GenBookService
import com.bible.monolith.service.SwordRegistry
import org.crosswire.jsword.book.BookCategory
import org.crosswire.jsword.book.Books
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import java.security.MessageDigest

/**
 * Index builder — extracts text from all data sources, chunks it,
 * embeds with all three models, and inserts into Zvec collections.
 *
 * Sources (in priority order):
 * 1. Library (library-data/ JSON files)
 * 2. Bible (H2 verses table)
 * 3. Commentary (JSword SWORD COMMENTARY modules)
 * 4. Dictionary (JSword SWORD DICTIONARY modules)
 * 5. Devotion (JSword SWORD DAILY_DEVOTIONS modules)
 * 6. GenBook (JSword SWORD GENERAL_BOOK modules)
 *
 * Course content is NOT indexed (per user requirement).
 */
@Service
class KbIndexService(
    private val embeddingService: KbEmbeddingService,
    private val zvecBridge: ZvecBridge,
    private val docRepo: KbDocumentRepository,
    private val verseRepo: VerseRepository,
    private val bookRepo: BookRepository,
    private val translationRepo: TranslationRepository,
    private val swordCommentary: SwordCommentaryService,
    private val dictionaryService: DictionaryService,
    private val genBookService: GenBookService,
    private val swordRegistry: SwordRegistry
) {
    private val log = LoggerFactory.getLogger(KbIndexService::class.java)

    @Value("\${kb.sources.bible.translations:cuv_gb,KJV,BSB}")
    private lateinit var bibleTranslations: String

    @Value("\${kb.library-path:frontend/library-data}")
    private lateinit var libraryPath: String

    data class BuildProgress(
        val sourceType: String,
        val modelId: String,
        val processed: Int,
        val total: Int,
        val errors: Int
    )

    /** Build indexes for all sources with all three models */
    fun buildAll(progressCallback: ((BuildProgress) -> Unit)? = null, zhOnly: Boolean = false) {
        log.info("=== Building all knowledge base indexes (zhOnly={}) ===", zhOnly)

        // Process each source type independently to avoid OOM
        // For each source: extract docs → save to H2 → index with TF-IDF → clear docs from memory
        
        val extractors = listOf<( ) -> List<KbDocument>>(
            { extractBibleDocs(zhOnly) }
            // Library is processed incrementally below via processLibraryIncremental
        )

        for (extractor in extractors) {
            val docs = extractor()
            if (docs.isEmpty()) continue
            
            log.info("Processing {} docs from {}", docs.size, docs[0].sourceType)
            
            // Save to H2 first
            docRepo.saveAll(docs)
            docRepo.flush()
            log.info("  Saved {} docs to H2", docs.size)
            
            // Index with each model
            for (modelId in embeddingService.allModelIds) {
                val provider = embeddingService.getProvider(modelId)
                
                // Skip models that aren't ready (e.g., BGE without transformers.js)
                if (!provider.isAvailable()) {
                    log.info("  Skipping model {} (not available)", modelId)
                    continue
                }
                
                val bySource = docs.groupBy { it.sourceType }
                
                for ((sourceType, sourceDocs) in bySource) {
                    val collection = embeddingService.collectionName(modelId, sourceType)
                    zvecBridge.ensureCollection(collection, provider.dimension)
                    
                    val batchSize = 50
                    var processed = 0
                    var errors = 0
                    
                    for (batch in sourceDocs.chunked(batchSize)) {
                        try {
                            val texts = batch.map { it.chunkText ?: it.content }
                            val vectors = provider.embedBatch(texts)
                            zvecBridge.batchInsert(collection, batch, vectors)
                            
                            batch.forEach { doc ->
                                doc.setVecId(modelId, "${doc.sourceType}_${doc.sourceRef}_${doc.chunkIndex}")
                            }
                            docRepo.saveAll(batch)
                            processed += batch.size
                        } catch (e: Exception) {
                            log.warn("Batch failed ({}/{}): {}", modelId, sourceType, e.message)
                            errors += batch.size
                        }
                        
                        progressCallback?.invoke(
                            BuildProgress(sourceType, modelId, processed, sourceDocs.size, errors)
                        )
                    }
                    
                    zvecBridge.flush(collection)
                    log.info("  {} / {}: {} docs indexed, {} errors", modelId, sourceType, processed, errors)
                }
            }
            
            // Update indexed flags
            docRepo.saveAll(docs)
            docRepo.flush()
            
            // Clear docs from memory
            // docs is already consumed, let GC handle it
        }
        
        // Process library, dictionary, devotion, genbook incrementally (avoid OOM)
        processLibraryIncremental(progressCallback, zhOnly)
        if (!zhOnly) {
            processDictionaryIncremental(progressCallback)
            processDevotionIncremental(progressCallback)
            processGenBookIncremental(progressCallback)
        } else {
            processDictionaryIncrementalZh(progressCallback)
            // Commentary, devotion, genbook: no Chinese modules, skip
            log.info("Skipping devotion/genbook/commentary (zhOnly mode, no Chinese modules)")
        }
        
        log.info("=== Knowledge base build complete ===")
    }

    /** Process library books incrementally — extract, save, embed with ALL models, clear per book */
    private fun processLibraryIncremental(progressCallback: ((BuildProgress) -> Unit)?, zhOnly: Boolean = false) {
        log.info("--- Processing library books incrementally (all models) ---")
        
        val libDir = java.io.File(libraryPath)
        if (!libDir.exists()) {
            log.warn("Library path not found: {}", libraryPath)
            return
        }
        
        val modelIds = embeddingService.allModelIds.filter { 
            embeddingService.getProvider(it).isAvailable() 
        }
        log.info("  Models for library: {}", modelIds)
        
        // Ensure collections for all models
        for (modelId in modelIds) {
            val provider = embeddingService.getProvider(modelId)
            val collection = embeddingService.collectionName(modelId, "library")
            zvecBridge.ensureCollection(collection, provider.dimension)
        }
        
        var totalProcessed = 0
        var totalErrors = 0
        
        for (bookDir in libDir.listFiles { f -> f.isDirectory } ?: emptyArray()) {
            val metaFile = java.io.File(bookDir, "meta.json")
            if (!metaFile.exists()) continue
            
            try {
                val meta = com.fasterxml.jackson.databind.ObjectMapper().readTree(metaFile)
                val bookCode = bookDir.name
                val bookTitle = meta.get("title")?.asText() ?: bookCode
                val category = meta.get("category")?.asText() ?: "其他"
                val language = meta.get("language")?.asText() ?: "zh"
                
                // zhOnly: skip non-Chinese books
                if (zhOnly) {
                    val isCJK = bookTitle.any { it.code in 0x4e00..0x9fff }
                    if (language != "zh" && !isCJK) {
                        log.info("  Skipping non-Chinese book: {} ({})", bookCode, language)
                        continue
                    }
                }
                
                // Phase 1: Extract & save all docs for this book to H2
                val bookDocs = mutableListOf<KbDocument>()
                
                for (chapterFile in bookDir.listFiles { f -> f.name.endsWith(".json") && f.name != "meta.json" } ?: emptyArray()) {
                    val chapterJson = com.fasterxml.jackson.databind.ObjectMapper().readTree(chapterFile)
                    val chapterId = chapterFile.nameWithoutExtension
                    val chapterTitle = chapterJson.get("title")?.asText() ?: chapterId
                    val content = chapterJson.get("content")?.asText() ?: continue
                    
                    val chunks = chunkText(content, 400, 80)
                    for ((idx, chunk) in chunks.withIndex()) {
                        bookDocs.add(KbDocument(
                            sourceType = "library",
                            sourceRef = "$bookCode/$chapterId",
                            title = "$bookTitle — $chapterTitle",
                            content = if (chunks.size == 1) content else chunk,
                            contentHash = sha256(chunk),
                            chunkIndex = idx,
                            chunkText = chunk,
                            parentRef = "$bookCode/$chapterId",
                            bookCode = bookCode,
                            category = category,
                            language = language
                        ))
                    }
                }
                
                if (bookDocs.isEmpty()) continue
                docRepo.saveAll(bookDocs)
                docRepo.flush()
                
                // Phase 2: Index with each model (batch by batch, clear memory between models)
                for (modelId in modelIds) {
                    val provider = embeddingService.getProvider(modelId)
                    val collection = embeddingService.collectionName(modelId, "library")
                    val batchSize = 50
                    var modelProcessed = 0
                    var modelErrors = 0
                    
                    for (batch in bookDocs.chunked(batchSize)) {
                        try {
                            val texts = batch.map { it.chunkText ?: it.content }
                            val vectors = provider.embedBatch(texts)
                            zvecBridge.batchInsert(collection, batch, vectors)
                            batch.forEach { doc -> doc.setVecId(modelId, "library_" + doc.sourceRef + "_" + doc.chunkIndex) }
                            modelProcessed += batch.size
                        } catch (e: Exception) {
                            modelErrors += batch.size
                            log.warn("Library {} embed failed: {}", modelId, e.message)
                        }
                    }
                    
                    docRepo.saveAll(bookDocs)
                    docRepo.flush()
                    log.info("    {} / {}: {} chunks indexed", bookCode, modelId, modelProcessed)
                    
                    if (modelId == modelIds.first()) {
                        totalProcessed += modelProcessed
                        progressCallback?.invoke(BuildProgress("library", modelId, totalProcessed, -1, totalErrors))
                    }
                }
                
                bookDocs.clear()
            } catch (e: Exception) {
                log.warn("Failed to parse library book {}: {}", bookDir.name, e.message)
            }
        }
        
        // Flush all model collections
        for (modelId in modelIds) {
            zvecBridge.flush(embeddingService.collectionName(modelId, "library"))
        }
        log.info("  Library total: {} docs indexed, {} errors", totalProcessed, totalErrors)
    }

    /** Process commentary modules incrementally — extract, save, embed, clear per chapter */
    private fun processCommentaryIncremental(progressCallback: ((BuildProgress) -> Unit)?) {
        log.info("--- Processing commentary modules incrementally ---")
        
        val commentaryBooks = Books.installed().books
            .filter { it.bookCategory == BookCategory.COMMENTARY }
        
        val bookChapters = mapOf(
            "Gen" to 50, "Exod" to 40, "Lev" to 27, "Num" to 36, "Deut" to 34,
            "Josh" to 24, "Judg" to 21, "Ruth" to 4, "1Sam" to 31, "2Sam" to 24,
            "1Kgs" to 22, "2Kgs" to 25, "1Chr" to 29, "2Chr" to 36, "Ezra" to 10,
            "Neh" to 13, "Esth" to 10, "Job" to 42, "Ps" to 150, "Prov" to 31,
            "Eccl" to 12, "Song" to 8, "Isa" to 66, "Jer" to 52, "Lam" to 5,
            "Ezek" to 48, "Dan" to 12, "Hos" to 14, "Joel" to 3, "Amos" to 9,
            "Obad" to 1, "Jonah" to 4, "Mic" to 7, "Nah" to 3, "Hab" to 3,
            "Zeph" to 3, "Hag" to 2, "Zech" to 14, "Mal" to 4,
            "Matt" to 28, "Mark" to 16, "Luke" to 24, "John" to 21, "Acts" to 28,
            "Rom" to 16, "1Cor" to 16, "2Cor" to 13, "Gal" to 6, "Eph" to 6,
            "Phil" to 4, "Col" to 4, "1Thess" to 5, "2Thess" to 3, "1Tim" to 6,
            "2Tim" to 4, "Titus" to 3, "Phlm" to 1, "Heb" to 13, "Jas" to 5,
            "1Pet" to 5, "2Pet" to 3, "1John" to 5, "2John" to 1, "3John" to 1,
            "Jude" to 1, "Rev" to 22
        )
        
        val provider = embeddingService.getProvider("tfidf_256")
        val collection = embeddingService.collectionName("tfidf_256", "commentary")
        zvecBridge.ensureCollection(collection, provider.dimension)
        var totalProcessed = 0
        var totalErrors = 0
        
        for (book in commentaryBooks) {
            val module = book.initials
            val moduleName = book.name
            log.info("  Commentary: {}", module)
            var moduleCount = 0
            
            for ((osisBook, maxChapter) in bookChapters) {
                for (chapter in 1..maxChapter) {
                    val entries = try {
                        swordCommentary.getCommentaryForChapter(module, osisBook, chapter)
                    } catch (_: Exception) { emptyList() }
                    if (entries.isEmpty()) continue
                    
                    // Process this chapter's entries in micro-batches
                    val batchDocs = mutableListOf<KbDocument>()
                    for (entry in entries) {
                        val rawText = entry.text
                        if (rawText.isBlank() || rawText.length < 20) continue
                        val safeText = if (rawText.length > 10000) rawText.substring(0, 10000) else rawText
                        
                        val chunks = chunkText(safeText, 400, 80)
                        for ((idx, chunk) in chunks.withIndex()) {
                            batchDocs.add(KbDocument(
                                sourceType = "commentary",
                                sourceRef = "commentary/$module/${entry.bookId}/${entry.chapter}/${entry.verseStart}",
                                title = "$moduleName — ${entry.bookId} ${entry.chapter}:${entry.verseStart}",
                                content = if (chunks.size == 1) safeText else chunk,
                                contentHash = sha256(chunk),
                                chunkIndex = idx,
                                chunkText = chunk,
                                parentRef = "commentary/$module/${entry.bookId}/${entry.chapter}",
                                module = module,
                                moduleName = moduleName,
                                book = entry.bookId,
                                chapter = entry.chapter,
                                verseStart = entry.verseStart,
                                verseEnd = entry.verseEnd,
                                displayRef = "${entry.bookId} ${entry.chapter}:${entry.verseStart} — $module",
                                language = "en"
                            ))
                        }
                        
                        // Micro-batch: save + embed every 10 docs
                        if (batchDocs.size >= 10) {
                            docRepo.saveAll(batchDocs)
                            docRepo.flush()
                            try {
                                val texts = batchDocs.map { it.chunkText ?: it.content }
                                val vectors = provider.embedBatch(texts)
                                zvecBridge.batchInsert(collection, batchDocs, vectors)
                                totalProcessed += batchDocs.size
                                moduleCount += batchDocs.size
                            } catch (e: Exception) {
                                totalErrors += batchDocs.size
                                log.warn("Commentary embed failed: {}", e.message)
                            }
                            batchDocs.clear()
                        }
                    }
                    
                    // Process remaining for this chapter
                    if (batchDocs.isNotEmpty()) {
                    
                        docRepo.saveAll(batchDocs)
                        docRepo.flush()
                        try {
                            val texts = batchDocs.map { it.chunkText ?: it.content }
                            val vectors = provider.embedBatch(texts)
                            zvecBridge.batchInsert(collection, batchDocs, vectors)
                            totalProcessed += batchDocs.size
                            moduleCount += batchDocs.size
                        } catch (e: Exception) {
                            totalErrors += batchDocs.size
                        }
                        batchDocs.clear()
                    }
                    
                    progressCallback?.invoke(
                        BuildProgress("commentary", "tfidf_256", totalProcessed, -1, totalErrors)
                    )
                }
            }
            log.info("    {} -> {} chunks", module, moduleCount)
        }
        
        zvecBridge.flush(collection)
        log.info("  Commentary total: {} docs indexed, {} errors", totalProcessed, totalErrors)
    }
    
    /** Process dictionary modules incrementally — extract, save, embed, clear per entry batch */
    private fun processDictionaryIncremental(progressCallback: ((BuildProgress) -> Unit)?) {
        log.info("--- Processing dictionary modules incrementally ---")
        
        val dictBooks = Books.installed().books
            .filter { it.bookCategory == BookCategory.DICTIONARY }
        
        val provider = embeddingService.getProvider("tfidf_256")
        val collection = embeddingService.collectionName("tfidf_256", "dictionary")
        zvecBridge.ensureCollection(collection, provider.dimension)
        var totalProcessed = 0
        var totalErrors = 0
        
        for (book in dictBooks) {
            val module = book.initials
            val moduleName = book.name
            log.info("  Dictionary: {}", module)
            var moduleCount = 0
            
            try {
                val keys = book.getGlobalKeyList()
                val batchDocs = mutableListOf<KbDocument>()
                var keyCount = 0
                
                for (key in keys) {
                    keyCount++
                    if (keyCount > 50000) {
                        log.info("    Reached 50K key limit for {}", module)
                        break
                    }
                    val entryKey = key.name
                    if (entryKey.isBlank()) continue
                    
                    val rawContent = try {
                        book.getRawText(key)
                    } catch (_: Exception) { null }
                    if (rawContent.isNullOrBlank() || rawContent.length < 10) continue
                    val text = if (rawContent.length > 10000) rawContent.substring(0, 10000) else rawContent
                    
                    if (text.length > 5000) log.info("    Large entry: {} = {} chars", entryKey, text.length)
                    
                    val chunks = chunkText(text, 500, 100)
                    for ((idx, chunk) in chunks.withIndex()) {
                        batchDocs.add(KbDocument(
                            sourceType = "dictionary",
                            sourceRef = "dictionary/$module/$entryKey",
                            title = "$moduleName — $entryKey",
                            content = if (chunks.size == 1) text else chunk,
                            contentHash = sha256(chunk),
                            chunkIndex = idx,
                            chunkText = chunk,
                            parentRef = "dictionary/$module/$entryKey",
                            module = module,
                            moduleName = moduleName,
                            entryKey = entryKey,
                            language = detectLanguage(module)
                        ))
                    }
                    
                    // Process in batches of 100 entries
                    if (batchDocs.size >= 100) {
                        docRepo.saveAll(batchDocs)
                        docRepo.flush()
                        try {
                            val texts = batchDocs.map { it.chunkText ?: it.content }
                            val vectors = provider.embedBatch(texts)
                            zvecBridge.batchInsert(collection, batchDocs, vectors)
                            batchDocs.forEach { doc -> doc.setVecId("tfidf_256", "dictionary_${doc.sourceRef}_${doc.chunkIndex}") }
                            docRepo.saveAll(batchDocs)
                            totalProcessed += batchDocs.size
                            moduleCount += batchDocs.size
                        } catch (e: Exception) {
                            totalErrors += batchDocs.size
                            log.warn("Dict embed failed: {}", e.message)
                        }
                        batchDocs.clear()
                        progressCallback?.invoke(BuildProgress("dictionary", "tfidf_256", totalProcessed, -1, totalErrors))
                    }
                }
                
                // Process remaining
                if (batchDocs.isNotEmpty()) {
                    docRepo.saveAll(batchDocs)
                    docRepo.flush()
                    try {
                        val texts = batchDocs.map { it.chunkText ?: it.content }
                        val vectors = provider.embedBatch(texts)
                        zvecBridge.batchInsert(collection, batchDocs, vectors)
                        batchDocs.forEach { doc -> doc.setVecId("tfidf_256", "dictionary_${doc.sourceRef}_${doc.chunkIndex}") }
                        docRepo.saveAll(batchDocs)
                        totalProcessed += batchDocs.size
                        moduleCount += batchDocs.size
                    } catch (e: Exception) {
                        totalErrors += batchDocs.size
                    }
                    batchDocs.clear()
                }
            } catch (e: Exception) {
                log.warn("Dictionary {} failed: {}", module, e.message)
            }
            log.info("    {} -> {} chunks", module, moduleCount)
        }
        
        zvecBridge.flush(collection)
        log.info("  Dictionary total: {} docs indexed, {} errors", totalProcessed, totalErrors)
    }

    /** Process only Chinese dictionary modules */
    private fun processDictionaryIncrementalZh(progressCallback: ((BuildProgress) -> Unit)?) {
        log.info("--- Processing Chinese dictionary modules incrementally ---")
        
        val dictBooks = Books.installed().books
            .filter { it.bookCategory == BookCategory.DICTIONARY }
            .filter { detectLanguage(it.initials) == "zh" }
        
        log.info("  Chinese dictionary modules: {}", dictBooks.map { it.initials })
        
        val provider = embeddingService.getProvider("tfidf_256")
        val collection = embeddingService.collectionName("tfidf_256", "dictionary")
        zvecBridge.ensureCollection(collection, provider.dimension)
        var totalProcessed = 0
        var totalErrors = 0
        
        for (book in dictBooks) {
            val module = book.initials
            val moduleName = book.name
            log.info("  Dictionary (ZH): {}", module)
            var moduleCount = 0
            
            try {
                val keys = book.getGlobalKeyList()
                val batchDocs = mutableListOf<KbDocument>()
                
                for (key in keys) {
                    val entryKey = key.name
                    if (entryKey.isBlank()) continue
                    
                    val rawContent = try {
                        book.getRawText(key)
                    } catch (_: Exception) { null }
                    if (rawContent.isNullOrBlank() || rawContent.length < 10) continue
                    val text = if (rawContent.length > 10000) rawContent.substring(0, 10000) else rawContent
                    
                    val chunks = chunkText(text, 500, 100)
                    for ((idx, chunk) in chunks.withIndex()) {
                        batchDocs.add(KbDocument(
                            sourceType = "dictionary",
                            sourceRef = "dictionary/$module/$entryKey",
                            title = "$moduleName — $entryKey",
                            content = if (chunks.size == 1) text else chunk,
                            contentHash = sha256(chunk),
                            chunkIndex = idx,
                            chunkText = chunk,
                            parentRef = "dictionary/$module/$entryKey",
                            module = module,
                            moduleName = moduleName,
                            entryKey = entryKey,
                            language = "zh"
                        ))
                    }
                    
                    if (batchDocs.size >= 100) {
                        docRepo.saveAll(batchDocs)
                        docRepo.flush()
                        try {
                            val texts = batchDocs.map { it.chunkText ?: it.content }
                            val vectors = provider.embedBatch(texts)
                            zvecBridge.batchInsert(collection, batchDocs, vectors)
                            totalProcessed += batchDocs.size
                            moduleCount += batchDocs.size
                        } catch (e: Exception) {
                            totalErrors += batchDocs.size
                            log.warn("Dict embed failed: {}", e.message)
                        }
                        batchDocs.clear()
                        progressCallback?.invoke(BuildProgress("dictionary", "tfidf_256", totalProcessed, -1, totalErrors))
                    }
                }
                
                if (batchDocs.isNotEmpty()) {
                    docRepo.saveAll(batchDocs)
                    docRepo.flush()
                    try {
                        val texts = batchDocs.map { it.chunkText ?: it.content }
                        val vectors = provider.embedBatch(texts)
                        zvecBridge.batchInsert(collection, batchDocs, vectors)
                        totalProcessed += batchDocs.size
                        moduleCount += batchDocs.size
                    } catch (e: Exception) {
                        totalErrors += batchDocs.size
                    }
                    batchDocs.clear()
                }
            } catch (e: Exception) {
                log.warn("Dictionary {} failed: {}", module, e.message)
            }
            log.info("    {} -> {} chunks", module, moduleCount)
        }
        
        zvecBridge.flush(collection)
        log.info("  Chinese dictionary total: {} docs indexed, {} errors", totalProcessed, totalErrors)
    }

    /** Build index for a single source type only */
    fun buildSource(source: String, progressCallback: ((BuildProgress) -> Unit)? = null, zhOnly: Boolean = false) {
        log.info("=== Building source: {} (zhOnly={}) ===", source, zhOnly)
        
        when (source) {
            "bible" -> {
                val docs = extractBibleDocs(zhOnly)
                indexDocs(docs, progressCallback)
            }
            "library" -> processLibraryIncremental(progressCallback, zhOnly)
            "commentary" -> if (!zhOnly) processCommentaryIncremental(progressCallback) else log.info("Skipping commentary (zhOnly)")
            "dictionary" -> if (zhOnly) processDictionaryIncrementalZh(progressCallback) else processDictionaryIncremental(progressCallback)
            "devotion" -> if (!zhOnly) processDevotionIncremental(progressCallback) else log.info("Skipping devotion (zhOnly)")
            "genbook" -> if (!zhOnly) processGenBookIncremental(progressCallback) else log.info("Skipping genbook (zhOnly)")
            "devotion" -> processDevotionIncremental(progressCallback)
            "genbook" -> processGenBookIncremental(progressCallback)
            else -> log.warn("Unknown source: {}", source)
        }
        
        log.info("=== Source {} build complete ===", source)
    }
    
    /** Index a list of docs with all available models */
    private fun indexDocs(docs: List<KbDocument>, progressCallback: ((BuildProgress) -> Unit)?) {
        if (docs.isEmpty()) return
        
        // Save to H2
        docRepo.saveAll(docs)
        docRepo.flush()
        
        for (modelId in embeddingService.allModelIds) {
            val provider = embeddingService.getProvider(modelId)
            if (!provider.isAvailable()) {
                log.info("  Skipping model {} (not available)", modelId)
                continue
            }
            
            val bySource = docs.groupBy { it.sourceType }
            for ((sourceType, sourceDocs) in bySource) {
                val collection = embeddingService.collectionName(modelId, sourceType)
                zvecBridge.ensureCollection(collection, provider.dimension)
                
                var processed = 0
                var errors = 0
                for (batch in sourceDocs.chunked(50)) {
                    try {
                        val texts = batch.map { it.chunkText ?: it.content }
                        val vectors = provider.embedBatch(texts)
                        zvecBridge.batchInsert(collection, batch, vectors)
                        processed += batch.size
                    } catch (e: Exception) {
                        errors += batch.size
                    }
                    progressCallback?.invoke(BuildProgress(sourceType, modelId, processed, sourceDocs.size, errors))
                }
                zvecBridge.flush(collection)
                log.info("  {} / {}: {} docs indexed, {} errors", modelId, sourceType, processed, errors)
            }
        }
    }

    /** Build index for a single model only */
    fun buildModel(modelId: String, progressCallback: ((BuildProgress) -> Unit)? = null) {
        val provider = embeddingService.getProvider(modelId)
        log.info("Building index with model: {} ({}d)", modelId, provider.dimension)

        val pageable = PageRequest.of(0, 100)
        var page = docRepo.findAll(pageable)
        var processed = 0

        while (page.hasContent()) {
            val docs = page.content
            val bySource = docs.groupBy { it.sourceType }

            for ((sourceType, batch) in bySource) {
                val collection = embeddingService.collectionName(modelId, sourceType)
                zvecBridge.ensureCollection(collection, provider.dimension)

                try {
                    val texts = batch.map { it.chunkText ?: it.content }
                    val vectors = provider.embedBatch(texts)
                    zvecBridge.batchInsert(collection, batch, vectors)
                    batch.forEach { it.setVecId(modelId, "${it.sourceType}_${it.sourceRef}_${it.chunkIndex}") }
                    docRepo.saveAll(batch)
                    processed += batch.size
                } catch (e: Exception) {
                    log.warn("Batch failed: {}", e.message)
                }

                progressCallback?.invoke(BuildProgress(sourceType, modelId, processed, page.totalElements.toInt(), 0))
            }

            if (page.hasNext()) {
                page = docRepo.findAll(page.nextPageable())
            } else break
        }

        docRepo.saveAll(docRepo.findAll())
        log.info("Model {} build complete: {} docs", modelId, processed)
    }

    // ──────────────────────────────────────────────────────────
    //  Source extractors
    // ──────────────────────────────────────────────────────────

    /** Extract library documents from library-data/ JSON files */
    private fun extractLibraryDocs(zhOnly: Boolean = false): List<KbDocument> {
        val docs = mutableListOf<KbDocument>()
        val libDir = java.io.File(libraryPath)
        if (!libDir.exists()) {
            log.warn("Library path not found: {}", libraryPath)
            return docs
        }

        for (bookDir in libDir.listFiles { f -> f.isDirectory } ?: emptyArray()) {
            val metaFile = java.io.File(bookDir, "meta.json")
            if (!metaFile.exists()) continue

            try {
                val meta = com.fasterxml.jackson.databind.ObjectMapper().readTree(metaFile)
                val bookCode = bookDir.name
                val bookTitle = meta.get("title")?.asText() ?: bookCode
                val category = meta.get("category")?.asText() ?: "其他"
                val language = meta.get("language")?.asText() ?: "zh"

                // Find chapter files
                for (chapterFile in bookDir.listFiles { f -> f.name.endsWith(".json") && f.name != "meta.json" } ?: emptyArray()) {
                    val chapterJson = com.fasterxml.jackson.databind.ObjectMapper().readTree(chapterFile)
                    val chapterId = chapterFile.nameWithoutExtension
                    val chapterTitle = chapterJson.get("title")?.asText() ?: chapterId
                    val content = chapterJson.get("content")?.asText() ?: continue

                    // Split into chunks
                    val chunks = chunkText(content, 400, 80)
                    for ((idx, chunk) in chunks.withIndex()) {
                        docs.add(KbDocument(
                            sourceType = "library",
                            sourceRef = "$bookCode/$chapterId",
                            title = "$bookTitle — $chapterTitle",
                            content = if (chunks.size == 1) content else chunk,
                            contentHash = sha256(chunk),
                            chunkIndex = idx,
                            chunkText = chunk,
                            parentRef = "$bookCode/$chapterId",
                            bookCode = bookCode,
                            category = category,
                            language = language
                        ))
                    }
                }
            } catch (e: Exception) {
                log.warn("Failed to parse library book {}: {}", bookDir.name, e.message)
            }
        }

        log.info("Library: {} chunks from {} books", docs.size, libDir.listFiles { f -> f.isDirectory }?.size ?: 0)
        return docs
    }

    /** Extract Bible verses from H2, grouped into pericope chunks */
    private fun extractBibleDocs(zhOnly: Boolean = false): List<KbDocument> {
        val docs = mutableListOf<KbDocument>()
        val translations = bibleTranslations.split(",").map { it.trim() }
            .let { if (zhOnly) it.filter { code -> code.startsWith("chi") || code == "cuv_gb" } else it }

        for (transCode in translations) {
            val trans = translationRepo.findByCode(transCode) ?: continue
            val books = bookRepo.findByTranslationOrderByOrderIndex(trans)
            var transChunkCount = 0

            for (book in books) {
                for (chapter in 1..book.chapterCount) {
                    val verses = verseRepo.findByBookAndChapterOrderByVerse(book, chapter)
                    if (verses.isEmpty()) continue

                    val verseGroups = verses.chunked(5)
                    for ((idx, group) in verseGroups.withIndex()) {
                        val text = group.joinToString(" ") { it.text }
                        val vStart = group.first().verse
                        val vEnd = group.last().verse
                        val displayRef = "${book.name} ${chapter}:${if (vStart == vEnd) vStart else "$vStart-$vEnd"}"

                        docs.add(KbDocument(
                            sourceType = "bible",
                            sourceRef = "bible/${trans.code}/${book.bookId}/$chapter/$vStart-$vEnd",
                            title = "$displayRef (${trans.code})",
                            content = text,
                            contentHash = sha256(text),
                            chunkIndex = idx,
                            chunkText = text,
                            translation = trans.code,
                            book = book.bookId,
                            bookName = book.name,
                            chapter = chapter,
                            verseStart = vStart,
                            verseEnd = vEnd,
                            displayRef = displayRef,
                            language = if (trans.code.startsWith("chi") || trans.code == "cuv_gb") "zh" else "en"
                        ))
                        transChunkCount++
                    }
                }
            }

            log.info("Bible {}: {} chunks", transCode, transChunkCount)
        }

        return docs
    }

    /** Extract commentary entries from all SWORD COMMENTARY modules */
    private fun extractCommentaryDocs(): List<KbDocument> {
        val docs = mutableListOf<KbDocument>()
        val commentaryBooks = Books.installed().books
            .filter { it.bookCategory == BookCategory.COMMENTARY }

        // OSIS book IDs with their chapter counts
        val bookChapters = mapOf(
            "Gen" to 50, "Exod" to 40, "Lev" to 27, "Num" to 36, "Deut" to 34,
            "Josh" to 24, "Judg" to 21, "Ruth" to 4, "1Sam" to 31, "2Sam" to 24,
            "1Kgs" to 22, "2Kgs" to 25, "1Chr" to 29, "2Chr" to 36, "Ezra" to 10,
            "Neh" to 13, "Esth" to 10, "Job" to 42, "Ps" to 150, "Prov" to 31,
            "Eccl" to 12, "Song" to 8, "Isa" to 66, "Jer" to 52, "Lam" to 5,
            "Ezek" to 48, "Dan" to 12, "Hos" to 14, "Joel" to 3, "Amos" to 9,
            "Obad" to 1, "Jonah" to 4, "Mic" to 7, "Nah" to 3, "Hab" to 3,
            "Zeph" to 3, "Hag" to 2, "Zech" to 14, "Mal" to 4,
            "Matt" to 28, "Mark" to 16, "Luke" to 24, "John" to 21, "Acts" to 28,
            "Rom" to 16, "1Cor" to 16, "2Cor" to 13, "Gal" to 6, "Eph" to 6,
            "Phil" to 4, "Col" to 4, "1Thess" to 5, "2Thess" to 3, "1Tim" to 6,
            "2Tim" to 4, "Titus" to 3, "Phlm" to 1, "Heb" to 13, "Jas" to 5,
            "1Pet" to 5, "2Pet" to 3, "1John" to 5, "2John" to 1, "3John" to 1,
            "Jude" to 1, "Rev" to 22
        )

        for (book in commentaryBooks) {
            val module = book.initials
            val moduleName = book.name
            log.info("  Commentary: {}", module)
            var moduleChunkCount = 0

            // Iterate through all books and chapters (using actual chapter counts)
            for ((osisBook, maxChapter) in bookChapters) {
                for (chapter in 1..maxChapter) {
                    val entries = try {
                        swordCommentary.getCommentaryForChapter(module, osisBook, chapter)
                    } catch (_: Exception) { emptyList() }
                    if (entries.isEmpty()) continue

                    for (entry in entries) {
                        val text = entry.text
                        if (text.isBlank() || text.length < 20) continue
                        
                        // Truncate extremely long entries to avoid OOM
                        val safeText = if (text.length > 50000) text.substring(0, 50000) else text

                        val chunks = chunkText(safeText, 400, 80)
                        for ((idx, chunk) in chunks.withIndex()) {
                            docs.add(KbDocument(
                                sourceType = "commentary",
                                sourceRef = "commentary/$module/${entry.bookId}/${entry.chapter}/${entry.verseStart}",
                                title = "${moduleName} — ${entry.bookId} ${entry.chapter}:${entry.verseStart}",
                                content = if (chunks.size == 1) safeText else chunk,
                                contentHash = sha256(chunk),
                                chunkIndex = idx,
                                chunkText = chunk,
                                parentRef = "commentary/$module/${entry.bookId}/${entry.chapter}",
                                module = module,
                                moduleName = moduleName,
                                book = entry.bookId,
                                chapter = entry.chapter,
                                verseStart = entry.verseStart,
                                verseEnd = entry.verseEnd,
                                displayRef = "${entry.bookId} ${entry.chapter}:${entry.verseStart} — $module",
                                language = "en"
                            ))
                            moduleChunkCount++
                        }
                    }
                }
            }
            log.info("    {} -> {} chunks", module, moduleChunkCount)
            
            // Batch save to avoid holding everything in memory
            if (docs.size > 500) {
                docRepo.saveAll(docs.toList())
                docRepo.flush()
                docs.clear()
            }
        }

        // Save remaining
        if (docs.isNotEmpty()) {
            docRepo.saveAll(docs.toList())
            docRepo.flush()
        }
        
        log.info("Commentary: extracted from {} modules", commentaryBooks.size)
        return docs
    }

    /** Extract dictionary entries from all SWORD DICTIONARY modules */
    private fun extractDictionaryDocs(): List<KbDocument> {
        val docs = mutableListOf<KbDocument>()
        val dictBooks = Books.installed().books
            .filter { it.bookCategory == BookCategory.DICTIONARY }

        for (book in dictBooks) {
            val module = book.initials
            val moduleName = book.name
            log.info("  Dictionary: {}", module)

            try {
                val keys = book.getGlobalKeyList()
                for (key in keys) {
                    val entryKey = key.name
                    if (entryKey.isBlank()) continue

                    val content = try {
                        book.getRawText(key)
                    } catch (_: Exception) { null }

                    if (content.isNullOrBlank() || content.length < 10) continue

                    val chunks = chunkText(content, 500, 100)
                    for ((idx, chunk) in chunks.withIndex()) {
                        docs.add(KbDocument(
                            sourceType = "dictionary",
                            sourceRef = "dictionary/$module/$entryKey",
                            title = "$moduleName — $entryKey",
                            content = if (chunks.size == 1) content else chunk,
                            contentHash = sha256(chunk),
                            chunkIndex = idx,
                            chunkText = chunk,
                            parentRef = "dictionary/$module/$entryKey",
                            module = module,
                            moduleName = moduleName,
                            entryKey = entryKey,
                            language = detectLanguage(module)
                        ))
                    }
                }
            } catch (e: Exception) {
                log.warn("  Failed to read dictionary {}: {}", module, e.message)
            }
        }

        log.info("Dictionary: {} chunks from {} modules", docs.size, dictBooks.size)
        return docs
    }

    /** Extract devotion entries from SWORD DAILY_DEVOTIONS modules */
    private fun extractDevotionDocs(): List<KbDocument> {
        val docs = mutableListOf<KbDocument>()
        val devotionBooks = Books.installed().books
            .filter { it.bookCategory == BookCategory.DAILY_DEVOTIONS }

        for (book in devotionBooks) {
            val module = book.initials
            val moduleName = book.name
            log.info("  Devotion: {}", module)

            try {
                val keys = book.getGlobalKeyList()
                for (key in keys) {
                    val dateKey = key.name
                    if (dateKey.isBlank()) continue

                    val content = try {
                        book.getRawText(key)
                    } catch (_: Exception) { null }

                    if (content.isNullOrBlank() || content.length < 20) continue

                    val chunks = chunkText(content, 500, 100)
                    for ((idx, chunk) in chunks.withIndex()) {
                        docs.add(KbDocument(
                            sourceType = "devotion",
                            sourceRef = "devotion/$module/$dateKey",
                            title = "$moduleName — $dateKey",
                            content = if (chunks.size == 1) content else chunk,
                            contentHash = sha256(chunk),
                            chunkIndex = idx,
                            chunkText = chunk,
                            parentRef = "devotion/$module/$dateKey",
                            module = module,
                            moduleName = moduleName,
                            dateKey = dateKey,
                            language = "en"
                        ))
                    }
                }
            } catch (e: Exception) {
                log.warn("  Failed to read devotion {}: {}", module, e.message)
            }
        }

        log.info("Devotion: {} chunks from {} modules", docs.size, devotionBooks.size)
        return docs
    }

    /** Extract general book content from SWORD GENERAL_BOOK modules */
    private fun extractGenBookDocs(): List<KbDocument> {
        val docs = mutableListOf<KbDocument>()
        val genBooks = Books.installed().books
            .filter { it.bookCategory == BookCategory.GENERAL_BOOK }

        for (book in genBooks) {
            val module = book.initials
            val moduleName = book.name
            log.info("  GenBook: {}", module)

            try {
                val keys = book.getGlobalKeyList()
                for (key in keys) {
                    val chapterKey = key.name
                    if (chapterKey.isBlank()) continue

                    val content = try {
                        book.getRawText(key)
                    } catch (_: Exception) { null }

                    if (content.isNullOrBlank() || content.length < 20) continue

                    val chunks = chunkText(content, 400, 80)
                    for ((idx, chunk) in chunks.withIndex()) {
                        docs.add(KbDocument(
                            sourceType = "genbook",
                            sourceRef = "genbook/$module/$chapterKey",
                            title = "$moduleName — $chapterKey",
                            content = if (chunks.size == 1) content else chunk,
                            contentHash = sha256(chunk),
                            chunkIndex = idx,
                            chunkText = chunk,
                            parentRef = "genbook/$module/$chapterKey",
                            module = module,
                            moduleName = moduleName,
                            language = detectLanguage(module)
                        ))
                    }
                }
            } catch (e: Exception) {
                log.warn("  Failed to read genbook {}: {}", module, e.message)
            }
        }

        log.info("GenBook: {} chunks from {} modules", docs.size, genBooks.size)
        return docs
    }

    // ──────────────────────────────────────────────────────────
    //  Utilities
    // ──────────────────────────────────────────────────────────

    /** Split text into overlapping chunks */
    private fun chunkText(text: String, targetSize: Int, overlap: Int): List<String> {
        // Hard limit: truncate extremely long text to avoid OOM
        val safeText = if (text.length > 100000) text.substring(0, 100000) else text
        if (safeText.length <= targetSize) return listOf(safeText)

        val chunks = mutableListOf<String>()
        var pos = 0
        while (pos < safeText.length) {
            val end = (pos + targetSize).coerceAtMost(safeText.length)
            // Try to break at sentence boundary
            var breakPoint = end
            if (end < text.length) {
                // Look for period, question mark, exclamation within last 20% of chunk
                val searchStart = pos + (targetSize * 0.8).toInt()
                val searchEnd = end
                for (i in searchEnd downTo searchStart) {
                    val ch = text[i]
                    if (ch == '.' || ch == '?' || ch == '!' || ch == '。' || ch == '？' || ch == '！') {
                        breakPoint = i + 1
                        break
                    }
                    // Also break at newline
                    if (ch == '\n') {
                        breakPoint = i + 1
                        break
                    }
                }
            }
            chunks.add(safeText.substring(pos, breakPoint).trim())
            val nextPos = breakPoint - overlap
            // Ensure forward progress: nextPos must be > pos
            pos = if (nextPos <= pos) breakPoint else nextPos
        }
        return chunks.filter { it.isNotBlank() }
    }

/** SHA-256 hash */
    private fun sha256(s: String): String {
        val md = MessageDigest.getInstance("SHA-256")
        val bytes = md.digest(s.toByteArray(Charsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }

    /** Process devotion modules incrementally */
    private fun processDevotionIncremental(progressCallback: ((BuildProgress) -> Unit)?) {
        log.info("--- Processing devotion modules incrementally ---")
        
        val devotionBooks = Books.installed().books
            .filter { it.bookCategory == BookCategory.DAILY_DEVOTIONS }
        
        val provider = embeddingService.getProvider("tfidf_256")
        val collection = embeddingService.collectionName("tfidf_256", "devotion")
        zvecBridge.ensureCollection(collection, provider.dimension)
        var totalProcessed = 0
        var totalErrors = 0
        
        for (book in devotionBooks) {
            val module = book.initials
            val moduleName = book.name
            log.info("  Devotion: {}", module)
            var moduleCount = 0
            
            try {
                val keys = book.getGlobalKeyList()
                val batchDocs = mutableListOf<KbDocument>()
                
                for (key in keys) {
                    val dateKey = key.name
                    if (dateKey.isBlank()) continue
                    
                    val content = try {
                        book.getRawText(key)
                    } catch (_: Exception) { null }
                    if (content.isNullOrBlank() || content.length < 20) continue
                    
                    val chunks = chunkText(content, 500, 100)
                    for ((idx, chunk) in chunks.withIndex()) {
                        batchDocs.add(KbDocument(
                            sourceType = "devotion",
                            sourceRef = "devotion/$module/$dateKey",
                            title = "$moduleName — $dateKey",
                            content = if (chunks.size == 1) content else chunk,
                            contentHash = sha256(chunk),
                            chunkIndex = idx,
                            chunkText = chunk,
                            parentRef = "devotion/$module/$dateKey",
                            module = module,
                            moduleName = moduleName,
                            dateKey = dateKey,
                            language = "en"
                        ))
                    }
                    
                    if (batchDocs.size >= 50) {
                        docRepo.saveAll(batchDocs)
                        docRepo.flush()
                        try {
                            val texts = batchDocs.map { it.chunkText ?: it.content }
                            val vectors = provider.embedBatch(texts)
                            zvecBridge.batchInsert(collection, batchDocs, vectors)
                            totalProcessed += batchDocs.size
                            moduleCount += batchDocs.size
                        } catch (e: Exception) {
                            totalErrors += batchDocs.size
                            log.warn("Devotion embed failed: {}", e.message)
                        }
                        batchDocs.clear()
                        progressCallback?.invoke(BuildProgress("devotion", "tfidf_256", totalProcessed, -1, totalErrors))
                    }
                }
                
                if (batchDocs.isNotEmpty()) {
                    docRepo.saveAll(batchDocs)
                    docRepo.flush()
                    try {
                        val texts = batchDocs.map { it.chunkText ?: it.content }
                        val vectors = provider.embedBatch(texts)
                        zvecBridge.batchInsert(collection, batchDocs, vectors)
                        totalProcessed += batchDocs.size
                        moduleCount += batchDocs.size
                    } catch (e: Exception) {
                        totalErrors += batchDocs.size
                    }
                    batchDocs.clear()
                }
            } catch (e: Exception) {
                log.warn("Devotion {} failed: {}", module, e.message)
            }
            log.info("    {} -> {} chunks", module, moduleCount)
        }
        
        zvecBridge.flush(collection)
        log.info("  Devotion total: {} docs indexed, {} errors", totalProcessed, totalErrors)
    }
    
    /** Process genbook modules incrementally */
    private fun processGenBookIncremental(progressCallback: ((BuildProgress) -> Unit)?) {
        log.info("--- Processing genbook modules incrementally ---")
        
        val genBooks = Books.installed().books
            .filter { it.bookCategory == BookCategory.GENERAL_BOOK }
        
        val provider = embeddingService.getProvider("tfidf_256")
        val collection = embeddingService.collectionName("tfidf_256", "genbook")
        zvecBridge.ensureCollection(collection, provider.dimension)
        var totalProcessed = 0
        var totalErrors = 0
        
        for (book in genBooks) {
            val module = book.initials
            val moduleName = book.name
            log.info("  GenBook: {}", module)
            var moduleCount = 0
            
            try {
                val keys = book.getGlobalKeyList()
                val batchDocs = mutableListOf<KbDocument>()
                
                for (key in keys) {
                    val keyName = key.name
                    if (keyName.isBlank()) continue
                    
                    val content = try {
                        book.getRawText(key)
                    } catch (_: Exception) { null }
                    if (content.isNullOrBlank() || content.length < 20) continue
                    
                    val chunks = chunkText(content, 500, 100)
                    for ((idx, chunk) in chunks.withIndex()) {
                        batchDocs.add(KbDocument(
                            sourceType = "genbook",
                            sourceRef = "genbook/$module/$keyName",
                            title = "$moduleName — $keyName",
                            content = if (chunks.size == 1) content else chunk,
                            contentHash = sha256(chunk),
                            chunkIndex = idx,
                            chunkText = chunk,
                            parentRef = "genbook/$module/$keyName",
                            module = module,
                            moduleName = moduleName,
                            language = "en"
                        ))
                    }
                    
                    if (batchDocs.size >= 50) {
                        docRepo.saveAll(batchDocs)
                        docRepo.flush()
                        try {
                            val texts = batchDocs.map { it.chunkText ?: it.content }
                            val vectors = provider.embedBatch(texts)
                            zvecBridge.batchInsert(collection, batchDocs, vectors)
                            totalProcessed += batchDocs.size
                            moduleCount += batchDocs.size
                        } catch (e: Exception) {
                            totalErrors += batchDocs.size
                            log.warn("Genbook embed failed: {}", e.message)
                        }
                        batchDocs.clear()
                        progressCallback?.invoke(BuildProgress("genbook", "tfidf_256", totalProcessed, -1, totalErrors))
                    }
                }
                
                if (batchDocs.isNotEmpty()) {
                    docRepo.saveAll(batchDocs)
                    docRepo.flush()
                    try {
                        val texts = batchDocs.map { it.chunkText ?: it.content }
                        val vectors = provider.embedBatch(texts)
                        zvecBridge.batchInsert(collection, batchDocs, vectors)
                        totalProcessed += batchDocs.size
                        moduleCount += batchDocs.size
                    } catch (e: Exception) {
                        totalErrors += batchDocs.size
                    }
                    batchDocs.clear()
                }
            } catch (e: Exception) {
                log.warn("Genbook {} failed: {}", module, e.message)
            }
            log.info("    {} -> {} chunks", module, moduleCount)
        }
        
        zvecBridge.flush(collection)
        log.info("  GenBook total: {} docs indexed, {} errors", totalProcessed, totalErrors)
    }

    /** Detect language from module name */
    private fun detectLanguage(module: String): String {
        if (module.startsWith("Ch")) return "zh"     // Chinese modules
        if (module.startsWith("Zh")) return "zh"
        if (module.startsWith("FVDP")) return "vi"
        if (module.startsWith("alzat")) return "ar"
        return "en"
    }

    /** Get index statistics */
    fun getStats(): Map<String, Any> {
        val stats = mutableMapOf<String, Any>()
        val indexStats = docRepo.indexStats()
        val sourceStats = mutableMapOf<String, Map<String, Long>>()
        for (row in indexStats) {
            val sourceType = row[0] as String
            val indexedTfidf = (row[1] as Number).toLong()
            val indexedBgesmall = (row[2] as Number).toLong()
            val indexedBgebase = (row[3] as Number).toLong()
            val total = (row[4] as Number).toLong()
            sourceStats[sourceType] = mapOf(
                "total" to total,
                "tfidf_256" to indexedTfidf,
                "bgesmall_512" to indexedBgesmall,
                "bgebase_768" to indexedBgebase
            )
        }
        stats["sources"] = sourceStats
        stats["zvecAvailable"] = zvecBridge.isAvailable()
        stats["zvecStatus"] = zvecBridge.status() ?: mapOf("available" to false)
        return stats
    }

    /** Clear all KB documents and Zvec collections */
    fun clearAll() {
        log.info("Deleting all KB documents from H2...")
        docRepo.deleteAll()
        docRepo.flush()
        log.info("KB documents cleared")
        
        // Clear Zvec collections
        try {
            for (sourceType in listOf("bible", "dictionary", "commentary", "devotion", "genbook", "library")) {
                val collection = embeddingService.collectionName("tfidf_256", sourceType)
                zvecBridge.dropCollection(collection)
            }
        } catch (e: Exception) {
            log.warn("Zvec cleanup error: {}", e.message)
        }
        log.info("KB index cleared")
    }
}
