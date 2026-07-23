package com.bible.monolith.kb.service

import com.bible.monolith.kb.model.KbDocument
import com.fasterxml.jackson.databind.ObjectMapper
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.util.concurrent.TimeUnit

/**
 * Bridge to the Node.js Zvec service (running inside frontend on port 3000).
 *
 * Zvec is an embedded vector database — all vectors live in the Node.js process.
 * This bridge communicates via HTTP to insert, search, and manage vectors.
 *
 * Collections: {modelId}_{sourceType}, e.g. "tfidf_256_bible", "bgebase_768_commentary"
 */
@Service
class ZvecBridge(
    @Value("\${kb.node-service-url:http://localhost:3000}") private val nodeServiceUrl: String
) {
    private val log = LoggerFactory.getLogger(ZvecBridge::class.java)
    private val objectMapper = ObjectMapper()
    private val json = "application/json".toMediaType()

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    data class ZvecSearchResult(
        val id: String,
        val score: Float,
        val metadata: Map<String, Any?>
    )

    data class ZvecBatchInsertResult(
        val inserted: Int,
        val collection: String
    )

    /** Check if Zvec service is available */
    fun isAvailable(): Boolean {
        return try {
            val req = Request.Builder().url("$nodeServiceUrl/zvec/status").get().build()
            client.newCall(req).execute().use { it.isSuccessful }
        } catch (e: Exception) {
            false
        }
    }

    /** Get service status */
    fun status(): Map<String, Any>? {
        return try {
            val req = Request.Builder().url("$nodeServiceUrl/zvec/status").get().build()
            client.newCall(req).execute().use { resp ->
                if (resp.isSuccessful) {
                    objectMapper.readValue(resp.body!!.string(), Map::class.java) as Map<String, Any>
                } else null
            }
        } catch (e: Exception) {
            null
        }
    }

    /** Ensure a collection exists with the correct dimension */
    fun ensureCollection(collection: String, dimension: Int) {
        val body = objectMapper.writeValueAsString(mapOf(
            "collection" to collection,
            "dimension" to dimension
        ))
        val req = Request.Builder()
            .url("$nodeServiceUrl/zvec/collection")
            .post(body.toRequestBody(json))
            .build()
        client.newCall(req).execute().use { resp ->
            if (!resp.isSuccessful) {
                log.warn("ensureCollection {} failed: {}", collection, resp.code)
            }
        }
    }

    /** Batch insert vectors into a collection */
    fun batchInsert(
        collection: String,
        documents: List<KbDocument>,
        vectors: List<FloatArray>
    ): ZvecBatchInsertResult {
        require(documents.size == vectors.size) { "documents and vectors must have same length" }

        val items = documents.zip(vectors).map { (doc, vec) ->
            mapOf(
                "id" to "${doc.sourceType}_${doc.sourceRef}_${doc.chunkIndex}",
                "vector" to vec.toList(),
                "metadata" to mapOf(
                    "source_type" to doc.sourceType,
                    "source_ref" to doc.sourceRef,
                    "title" to doc.title,
                    "chunk_index" to doc.chunkIndex,
                    "translation" to doc.translation,
                    "book" to doc.book,
                    "book_name" to doc.bookName,
                    "chapter" to doc.chapter,
                    "verse_start" to doc.verseStart,
                    "verse_end" to doc.verseEnd,
                    "display_ref" to doc.displayRef,
                    "module" to doc.module,
                    "module_name" to doc.moduleName,
                    "entry_key" to doc.entryKey,
                    "date_key" to doc.dateKey,
                    "book_code" to doc.bookCode,
                    "category" to doc.category,
                    "language" to doc.language,
                    "parent_ref" to doc.parentRef
                ).filterValues { it != null }
            )
        }

        // Send in batches of 100 to avoid HTTP body size limits
        var totalInserted = 0
        for (batch in items.chunked(100)) {
            val body = objectMapper.writeValueAsString(mapOf(
                "collection" to collection,
                "items" to batch
            ))
            val req = Request.Builder()
                .url("$nodeServiceUrl/zvec/insert")
                .post(body.toRequestBody(json))
                .build()
            client.newCall(req).execute().use { resp ->
                if (!resp.isSuccessful) {
                    throw RuntimeException("Batch insert failed: HTTP ${resp.code}")
                }
                totalInserted += batch.size
            }
        }

        return ZvecBatchInsertResult(totalInserted, collection)
    }

    /** Search a collection for the nearest vectors to a query vector */
    fun search(
        collection: String,
        queryVector: FloatArray,
        topK: Int = 10,
        filters: Map<String, Any>? = null
    ): List<ZvecSearchResult> {
        val body = objectMapper.writeValueAsString(mapOf(
            "collection" to collection,
            "vector" to queryVector.toList(),
            "topK" to topK,
            "filters" to (filters ?: emptyMap<String, Any>())
        ))
        val req = Request.Builder()
            .url("$nodeServiceUrl/zvec/search")
            .post(body.toRequestBody(json))
            .build()

        client.newCall(req).execute().use { resp ->
            if (!resp.isSuccessful) {
                log.warn("Search failed: HTTP {} — {}", resp.code, resp.body?.string()?.take(200))
                return emptyList()
            }
            val root = objectMapper.readTree(resp.body!!.string())
            val results = root.get("results") ?: return emptyList()

            return results.map { r ->
                ZvecSearchResult(
                    id = r.get("id")?.asText() ?: "",
                    score = r.get("score")?.asDouble()?.toFloat() ?: 0f,
                    metadata = objectMapper.convertValue(
                        r.get("metadata") ?: objectMapper.createObjectNode(),
                        Map::class.java
                    ) as Map<String, Any?>
                )
            }
        }
    }

    /** Delete vectors by metadata filter */
    fun deleteByFilter(collection: String, filters: Map<String, Any>): Int {
        val body = objectMapper.writeValueAsString(mapOf(
            "collection" to collection,
            "filters" to filters
        ))
        val req = Request.Builder()
            .url("$nodeServiceUrl/zvec/delete")
            .post(body.toRequestBody(json))  // Using POST for delete-by-filter (body needed)
            .build()

        client.newCall(req).execute().use { resp ->
            if (!resp.isSuccessful) {
                log.warn("Delete failed: HTTP {}", resp.code)
                return 0
            }
            val root = objectMapper.readTree(resp.body!!.string())
            return root.get("deleted")?.asInt() ?: 0
        }
    }

    /** Get collection stats */
    fun collectionStats(collection: String): Map<String, Any>? {
        return try {
            val req = Request.Builder()
                .url("$nodeServiceUrl/zvec/collection/$collection/stats")
                .get().build()
            client.newCall(req).execute().use { resp ->
                if (resp.isSuccessful) {
                    objectMapper.readValue(resp.body!!.string(), Map::class.java) as Map<String, Any>
                } else null
            }
        } catch (e: Exception) {
            null
        }
    }

    /** Flush a collection to disk */
    fun flush(collection: String) {
        val body = objectMapper.writeValueAsString(mapOf("collection" to collection))
        val req = Request.Builder()
            .url("$nodeServiceUrl/zvec/flush")
            .post(body.toRequestBody(json))
            .build()
        client.newCall(req).execute().use { resp ->
            if (!resp.isSuccessful) {
                log.warn("Flush {} failed: {}", collection, resp.code)
            }
        }
    }

    fun dropCollection(collection: String) {
        val body = objectMapper.writeValueAsString(mapOf("collection" to collection))
        val req = Request.Builder()
            .url("$nodeServiceUrl/zvec/drop")
            .post(body.toRequestBody(json))
            .build()
        client.newCall(req).execute().use { resp ->
            if (!resp.isSuccessful) {
                log.warn("Drop {} failed: {}", collection, resp.code)
            }
        }
    }
}
