package com.bible.monolith.kb.service

import com.bible.monolith.kb.embedding.EmbeddingProvider
import com.bible.monolith.kb.embedding.RemoteSemanticEmbedding
import com.bible.monolith.kb.embedding.TfidfHashEmbedding
import com.bible.monolith.kb.model.KbIndexConfig
import com.bible.monolith.kb.repository.KbIndexConfigRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

/**
 * Embedding service router — manages three parallel embedding models
 * and routes embedding requests to the appropriate provider.
 *
 * Three models coexist:
 * 1. tfidf_256   — TF-IDF Hash, 256d, local Kotlin, zero dependency
 * 2. bgesmall_512 — BGE-small-zh, 512d, via Node.js transformers.js
 * 3. bgebase_768  — BGE-base-zh, 768d, via Node.js transformers.js
 *
 * All three indexes are built in parallel and coexist in Zvec.
 * Query can route to any model's collection instantly — no rebuild needed.
 */
@Service
class KbEmbeddingService(
    private val tfidfEmbedding: TfidfHashEmbedding,
    private val remoteSemantic: RemoteSemanticEmbedding,
    private val configRepo: KbIndexConfigRepository
) {
    private val log = LoggerFactory.getLogger(KbEmbeddingService::class.java)

    data class ModelInfo(
        val id: String,
        val name: String,
        val dimension: Int,
        val local: Boolean,
        val ready: Boolean,
        val description: String
    )

    /** All supported model IDs */
    val allModelIds = listOf("tfidf_256", "bgesmall_512", "bgebase_768")

    /** Get the provider for a given model ID */
    fun getProvider(modelId: String): EmbeddingProvider {
        return when (modelId) {
            "tfidf_256" -> tfidfEmbedding
            "bgesmall_512", "bgebase_768" -> {
                remoteSemantic.setActiveModel(modelId)
                remoteSemantic
            }
            else -> throw IllegalArgumentException("Unknown embedding model: $modelId")
        }
    }

    /** Embed text with a specific model */
    fun embed(text: String, modelId: String): FloatArray {
        return getProvider(modelId).embed(text)
    }

    /** Batch embed with a specific model */
    fun embedBatch(texts: List<String>, modelId: String): List<FloatArray> {
        return getProvider(modelId).embedBatch(texts)
    }

    /** Zvec collection name for a model + source type */
    fun collectionName(modelId: String, sourceType: String): String {
        return "${modelId}_${sourceType}"
    }

    /** List all models with status */
    fun listModels(): List<ModelInfo> {
        return listOf(
            ModelInfo("tfidf_256", "TF-IDF Hash 256d", 256, true,
                tfidfEmbedding.isReady(), "基线，零依赖，毫秒级"),
            ModelInfo("bgesmall_512", "BGE-small-zh 512d", 512, false,
                isModelReady("bgesmall_512"), "中文轻量语义，~35ms"),
            ModelInfo("bgebase_768", "BGE-base-zh 768d", 768, false,
                isModelReady("bgebase_768"), "最高精度中文语义，~80ms")
        )
    }

    /** Check if a specific remote model is ready */
    private fun isModelReady(modelId: String): Boolean {
        return try {
            remoteSemantic.setActiveModel(modelId)
            remoteSemantic.isReady()
        } catch (e: Exception) {
            false
        }
    }

    /** Get the default model (from config, or tfidf_256 if not set) */
    fun defaultModel(): String {
        return configRepo.findByConfigKey("default_model")?.configValue ?: "tfidf_256"
    }

    /** Set the default model */
    fun setDefaultModel(modelId: String) {
        require(allModelIds.contains(modelId)) { "Unknown model: $modelId" }
        val config = configRepo.findByConfigKey("default_model")
            ?: KbIndexConfig(configKey = "default_model", description = "Default embedding model")
        config.configValue = modelId
        configRepo.save(config)
        log.info("Default embedding model set to: {}", modelId)
    }
}
