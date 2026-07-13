package com.bible.monolith.kb.embedding

/**
 * Embedding provider interface — all embedding models implement this.
 * Supports runtime switching between TF-IDF, BGE-small, BGE-base.
 */
interface EmbeddingProvider {
    /** Model unique ID, e.g. "tfidf_256" */
    val modelId: String

    /** Vector dimension */
    val dimension: Int

    /** Human-readable name */
    val displayName: String

    /** Whether this model requires the Node.js service (transformers.js) */
    val requiresNodeService: Boolean

    /** Whether the model is ready for use */
    fun isReady(): Boolean

    /** Embed a single text into a vector */
    fun embed(text: String): FloatArray

    /** Embed multiple texts (batch) */
    fun embedBatch(texts: List<String>): List<FloatArray>
}
