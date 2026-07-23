package com.bible.monolith.kb.controller

import com.bible.monolith.kb.model.KbDocument
import com.bible.monolith.kb.repository.KbDocumentRepository
import com.bible.monolith.kb.service.KbEmbeddingService
import com.bible.monolith.kb.service.KbIndexService
import com.bible.monolith.kb.service.KbSearchService
import com.bible.monolith.kb.service.ZvecBridge
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

/**
 * Knowledge Base REST API.
 *
 * Search, index management, and model comparison endpoints.
 */
@RestController
@RequestMapping("/api/v1/kb")
class KbController(
    private val searchService: KbSearchService,
    private val indexService: KbIndexService,
    private val embeddingService: KbEmbeddingService,
    private val zvecBridge: ZvecBridge,
    private val docRepo: KbDocumentRepository
) {
    private val log = LoggerFactory.getLogger(KbController::class.java)

    // ─── Search ───

    @PostMapping("/search")
    fun search(@RequestBody req: SearchRequestDto): ResponseEntity<Any> {
        return try {
            val result = searchService.search(
                KbSearchService.SearchRequest(
                    query = req.query,
                    modelId = req.modelId ?: embeddingService.defaultModel(),
                    topK = req.topK ?: 10,
                    sourceTypes = req.sourceTypes,
                    translation = req.translation,
                    module = req.module,
                    bookCode = req.bookCode,
                    category = req.category,
                    mode = req.mode ?: "hybrid"
                )
            )
            ResponseEntity.ok(result)
        } catch (e: Exception) {
            log.error("Search failed", e)
            ResponseEntity.internalServerError().body(mapOf("error" to e.message))
        }
    }

    @PostMapping("/compare")
    fun compare(@RequestBody req: CompareRequestDto): ResponseEntity<Any> {
        return try {
            val results = searchService.compareModels(
                query = req.query,
                topK = req.topK ?: 5,
                sourceTypes = req.sourceTypes
            )
            ResponseEntity.ok(mapOf(
                "query" to req.query,
                "topK" to (req.topK ?: 5),
                "models" to results
            ))
        } catch (e: Exception) {
            log.error("Compare failed", e)
            ResponseEntity.internalServerError().body(mapOf("error" to e.message))
        }
    }

    // ─── Index management ───

    @PostMapping("/index/build-all")
    fun buildAll(@RequestParam(defaultValue = "false") zhOnly: Boolean): ResponseEntity<Any> {
        return try {
            log.info("Starting index build (zhOnly={})...", zhOnly)
            indexService.buildAll({ progress ->
                log.info("  {} / {}: {}/{} ({} errors)",
                    progress.modelId, progress.sourceType, progress.processed, progress.total, progress.errors)
            }, zhOnly)
            ResponseEntity.ok(mapOf("success" to true, "message" to "Index build complete", "zhOnly" to zhOnly))
        } catch (e: Exception) {
            log.error("Index build failed", e)
            ResponseEntity.internalServerError().body(mapOf("error" to e.message))
        }
    }

    @PostMapping("/index/build-source/{source}")
    fun buildSource(@PathVariable source: String, @RequestParam(defaultValue = "false") zhOnly: Boolean): ResponseEntity<Any> {
        return try {
            log.info("Building source: {} (zhOnly={})", source, zhOnly)
            indexService.buildSource(source, { progress ->
                log.info("  {} / {}: {}/{} ({} errors)",
                    progress.modelId, progress.sourceType, progress.processed, progress.total, progress.errors)
            }, zhOnly)
            ResponseEntity.ok(mapOf("success" to true, "source" to source, "zhOnly" to zhOnly))
        } catch (e: Exception) {
            log.error("Source build failed: {}", source, e)
            ResponseEntity.internalServerError().body(mapOf("error" to e.message))
        }
    }

    @PostMapping("/index/build/{modelId}")
    fun buildModel(@PathVariable modelId: String): ResponseEntity<Any> {
        return try {
            indexService.buildModel(modelId)
            ResponseEntity.ok(mapOf("success" to true, "model" to modelId))
        } catch (e: Exception) {
            ResponseEntity.internalServerError().body(mapOf("error" to e.message))
        }
    }

    // ─── Stats ───

    @GetMapping("/stats")
    fun stats(): ResponseEntity<Any> {
        return ResponseEntity.ok(indexService.getStats())
    }

    @DeleteMapping("/index/clear")
    fun clearIndex(): ResponseEntity<Any> {
        return try {
            log.info("Clearing all KB index data...")
            indexService.clearAll()
            ResponseEntity.ok(mapOf("success" to true, "message" to "All KB data cleared"))
        } catch (e: Exception) {
            log.error("Clear failed", e)
            ResponseEntity.internalServerError().body(mapOf("error" to e.message))
        }
    }

    @GetMapping("/status")
    fun status(): ResponseEntity<Any> {
        return ResponseEntity.ok(mapOf(
            "zvecAvailable" to zvecBridge.isAvailable(),
            "zvecStatus" to (zvecBridge.status() ?: mapOf("available" to false)),
            "models" to embeddingService.listModels(),
            "defaultModel" to embeddingService.defaultModel()
        ))
    }

    // ─── Models ───

    @GetMapping("/models")
    fun models(): ResponseEntity<Any> {
        return ResponseEntity.ok(mapOf(
            "models" to embeddingService.listModels(),
            "defaultModel" to embeddingService.defaultModel()
        ))
    }

    @PostMapping("/models/default")
    fun setDefaultModel(@RequestBody req: SetDefaultModelDto): ResponseEntity<Any> {
        return try {
            embeddingService.setDefaultModel(req.modelId)
            ResponseEntity.ok(mapOf("success" to true, "defaultModel" to req.modelId))
        } catch (e: Exception) {
            ResponseEntity.badRequest().body(mapOf("error" to e.message))
        }
    }

    // ─── Document content ───

    @GetMapping("/document")
    fun getDocument(
        @RequestParam sourceType: String,
        @RequestParam sourceRef: String,
        @RequestParam(required = false, defaultValue = "0") chunkIndex: Int
    ): ResponseEntity<Any> {
        val doc = docRepo.findFirstBySourceTypeAndSourceRefAndChunkIndex(sourceType, sourceRef, chunkIndex)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(mapOf(
            "sourceType" to doc.sourceType,
            "sourceRef" to doc.sourceRef,
            "title" to doc.title,
            "content" to doc.content,
            "chunkText" to doc.chunkText,
            "displayRef" to doc.displayRef,
            "module" to doc.module,
            "moduleName" to doc.moduleName,
            "translation" to doc.translation,
            "book" to doc.book,
            "bookName" to doc.bookName,
            "chapter" to doc.chapter,
            "verseStart" to doc.verseStart,
            "verseEnd" to doc.verseEnd,
            "language" to doc.language
        ))
    }

    // ─── DTOs ───

    data class SearchRequestDto(
        val query: String,
        val modelId: String? = null,
        val topK: Int? = null,
        val sourceTypes: Set<String>? = null,
        val translation: String? = null,
        val module: String? = null,
        val bookCode: String? = null,
        val category: String? = null,
        val mode: String? = null
    )

    data class CompareRequestDto(
        val query: String,
        val topK: Int? = null,
        val sourceTypes: Set<String>? = null
    )

    data class SetDefaultModelDto(
        val modelId: String
    )
}
