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

    @Value("\${kb.sources.library.path:library-data}")
    private lateinit var libraryPath: String

    data class BuildProgress(
        val sourceType: String,
        val modelId: String,
        val processed: Int,
        val total: Int,
        val errors: Int
    )

    /** Build indexes for all sources with all three models */
    fun buildAll(progressCallback: ((BuildProgress) -> Unit)? = null) {
        log.info("=== Building all knowledge base indexes ===")

        // Step 1: Extract and store documents from all sources
        val allDocs = mutableListOf<KbDocument>()
        allDocs.addAll(extractLibraryDocs())
        allDocs.addAll(extractBibleDocs())
        allDocs.addAll(extractCommentaryDocs())
        allDocs.addAll(extractDictionaryDocs())
        allDocs.addAll(extractDevotionDocs())
        allDocs.addAll(extractGenBookDocs())

        log.info("Total documents extracted: {}", allDocs.size)

        // Step 2: Save to H2
        docRepo.saveAll(allDocs)
        log.info("Documents saved to H2")

        // Step 3: For each model, embed and insert into Zvec
        for (modelId in embeddingService.allModelIds) {
            val provider = embeddingService.getProvider(modelId)
            log.info("--- Building index with model: {} ({}d) ---", modelId, provider.dimension)

            // Group by source type to use separate collections
            val bySource = allDocs.groupBy { it.sourceType }
            for ((sourceType, docs) in bySource) {
                val collection = embeddingService.collectionName(modelId, sourceType)
                zvecBridge.ensureCollection(collection, provider.dimension)

                val batchSize = 50  // keep batches small for memory
                var processed = 0
                var errors = 0

                for (batch in docs.chunked(batchSize)) {
                    try {
                        val texts = batch.map { it.chunkText ?: it.content }
                        val vectors = provider.embedBatch(texts)
                        zvecBridge.batchInsert(collection, batch, vectors)

                        // Mark as indexed
                        batch.forEach { doc ->
                            doc.setVecId(modelId, "${doc.sourceType}_${doc.sourceRef}_${doc.chunkIndex}")
                        }
                        processed += batch.size
                    } catch (e: Exception) {
                        log.warn("Batch failed ({}/{}): {}", modelId, sourceType, e.message)
                        errors += batch.size
                    }

                    progressCallback?.invoke(
                        BuildProgress(sourceType, modelId, processed, docs.size, errors)
                    )
                }

                zvecBridge.flush(collection)
                log.info("  {} / {}: {} docs indexed, {} errors", modelId, sourceType, processed, errors)
            }
        }

        // Step 4: Update indexed flags in H2
        docRepo.saveAll(allDocs)
        log.info("=== Knowledge base build complete ===")
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
    private fun extractLibraryDocs(): List<KbDocument> {
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
    private fun extractBibleDocs(): List<KbDocument> {
        val docs = mutableListOf<KbDocument>()
        val translations = bibleTranslations.split(",").map { it.trim() }

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

        // OSIS book IDs for all 66 canonical books
        val bookIds = listOf(
            "Gen","Exod","Lev","Num","Deut","Josh","Judg","Ruth","1Sam","2Sam",
            "1Kgs","2Kgs","1Chr","2Chr","Ezra","Neh","Esth","Job","Ps","Prov",
            "Eccl","Song","Isa","Jer","Lam","Ezek","Dan","Hos","Joel","Amos",
            "Obad","Jonah","Mic","Nah","Hab","Zeph","Hag","Zech","Mal",
            "Matt","Mark","Luke","John","Acts","Rom","1Cor","2Cor","Gal","Eph",
            "Phil","Col","1Thess","2Thess","1Tim","2Tim","Titus","Phlm","Heb","Jas",
            "1Pet","2Pet","1John","2John","3John","Jude","Rev"
        )

        for (book in commentaryBooks) {
            val module = book.initials
            val moduleName = book.name
            log.info("  Commentary: {}", module)

            // Iterate through all books and chapters
            for (osisBook in bookIds) {
                for (chapter in 1..150) {  // max 150 chapters (Psa 119 has 176 verses but we cap)
                    val entries = swordCommentary.getCommentaryForChapter(module, osisBook, chapter)
                    if (entries.isEmpty()) continue

                    for (entry in entries) {
                        val text = entry.text
                        if (text.isBlank() || text.length < 20) continue

                        val chunks = chunkText(text, 400, 80)
                        for ((idx, chunk) in chunks.withIndex()) {
                            docs.add(KbDocument(
                                sourceType = "commentary",
                                sourceRef = "commentary/$module/${entry.bookId}/${entry.chapter}/${entry.verseStart}",
                                title = "${moduleName} — ${entry.bookId} ${entry.chapter}:${entry.verseStart}",
                                content = if (chunks.size == 1) text else chunk,
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
                    }
                }
            }
        }

        log.info("Commentary: {} chunks from {} modules", docs.size, commentaryBooks.size)
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
        if (text.length <= targetSize) return listOf(text)

        val chunks = mutableListOf<String>()
        var pos = 0
        while (pos < text.length) {
            val end = (pos + targetSize).coerceAtMost(text.length)
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
            chunks.add(text.substring(pos, breakPoint).trim())
            pos = breakPoint - overlap
            if (pos < breakPoint - targetSize + overlap) pos = breakPoint  // ensure progress
        }
        return chunks.filter { it.isNotBlank() }
    }

/** SHA-256 hash */
    private fun sha256(s: String): String {
        val md = MessageDigest.getInstance("SHA-256")
        val bytes = md.digest(s.toByteArray(Charsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
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
}
