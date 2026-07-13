package com.bible.monolith.kb.controller

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
    private val zvecBridge: ZvecBridge
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
    fun buildAll(): ResponseEntity<Any> {
        return try {
            log.info("Starting full index build...")
            indexService.buildAll { progress ->
                log.info("  {} / {}: {}/{} ({} errors)",
                    progress.modelId, progress.sourceType, progress.processed, progress.total, progress.errors)
            }
            ResponseEntity.ok(mapOf("success" to true, "message" to "Index build complete"))
        } catch (e: Exception) {
            log.error("Index build failed", e)
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
