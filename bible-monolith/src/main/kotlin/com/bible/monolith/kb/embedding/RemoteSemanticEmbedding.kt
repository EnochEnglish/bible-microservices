package com.bible.monolith.kb.embedding

import com.fasterxml.jackson.databind.ObjectMapper
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.util.concurrent.TimeUnit

/**
 * Remote semantic embedding via HTTP call to Node.js transformers.js service.
 *
 * Supports two ONNX models:
 * - bgesmall_512: Xenova/bge-small-zh-v1.5 (512d, 24MB, ~35ms)
 * - bgebase_768:  Xenova/bge-base-zh-v1.5  (768d, 55MB, ~80ms)
 *
 * The Node.js service must be running and have models preloaded.
 */
@Component
class RemoteSemanticEmbedding(
    @Value("\${kb.node-service-url:http://localhost:3000}") private val nodeServiceUrl: String
) : EmbeddingProvider {

    private val log = LoggerFactory.getLogger(RemoteSemanticEmbedding::class.java)
    private val objectMapper = ObjectMapper()

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)   // first model load can be slow
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    // Model registry — dimension and display info per model ID
    private val modelRegistry = mapOf(
        "bgesmall_512" to ModelMeta("bgesmall_512", 512, "BGE-small-zh 512d", true),
        "bgebase_768"  to ModelMeta("bgebase_768", 768, "BGE-base-zh 768d", true)
    )

    data class ModelMeta(
        override val modelId: String,
        override val dimension: Int,
        override val displayName: String,
        override val requiresNodeService: Boolean
    ) : EmbeddingProvider {
        override fun isReady() = false
        override fun isAvailable() = false
        override fun embed(text: String) = FloatArray(0)
        override fun embedBatch(texts: List<String>) = emptyList<FloatArray>()
    }

    /** Currently active model ID (set by KbEmbeddingService) */
    @Volatile
    private var activeModelId: String = "bgesmall_512"

    fun setActiveModel(modelId: String) {
        require(modelRegistry.containsKey(modelId)) { "Unknown model: $modelId" }
        activeModelId = modelId
    }

    override val modelId: String get() = activeModelId
    override val dimension: Int get() = modelRegistry[activeModelId]!!.dimension
    override val displayName: String get() = modelRegistry[activeModelId]!!.displayName
    override val requiresNodeService: Boolean get() = true

    override fun isReady(): Boolean {
        return try {
            val req = Request.Builder().url("$nodeServiceUrl/zvec/status").get().build()
            httpClient.newCall(req).execute().use { resp ->
                if (!resp.isSuccessful) return false
                val node = objectMapper.readTree(resp.body!!.string())
                val loaded = node.get("loadedModels") ?: return false
                loaded.any { it.asText() == activeModelId }
            }
        } catch (e: Exception) {
            log.debug("Node service not ready: {}", e.message)
            false
        }
    }

    override fun isAvailable(): Boolean = isReady()

    override fun embed(text: String): FloatArray = embedBatch(listOf(text))[0]

    override fun embedBatch(texts: List<String>): List<FloatArray> {
        val reqBody = objectMapper.writeValueAsString(mapOf(
            "texts" to texts,
            "model" to activeModelId
        ))
        val req = Request.Builder()
            .url("$nodeServiceUrl/zvec/embed")
            .post(reqBody.toRequestBody("application/json".toMediaType()))
            .build()

        httpClient.newCall(req).execute().use { resp ->
            if (!resp.isSuccessful) {
                throw RuntimeException("Embedding failed: HTTP ${resp.code} — ${resp.body?.string()?.take(200)}")
            }
            val body = objectMapper.readTree(resp.body!!.string())
            val embeddings = body.get("embeddings")
            val dim = dimension
            return embeddings.map { arr ->
                FloatArray(dim) { i -> arr[i].asDouble().toFloat() }
            }
        }
    }

    /** List all available model metadata */
    fun availableModels(): List<ModelMeta> = modelRegistry.values.toList()
}
