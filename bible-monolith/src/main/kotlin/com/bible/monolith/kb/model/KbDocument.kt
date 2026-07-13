package com.bible.monolith.kb.model

import jakarta.persistence.*
import java.sql.Timestamp

/**
 * A single chunk of text from any source (Bible, commentary, dictionary, etc.)
 * that has been or will be embedded into the Zvec vector database.
 *
 * One KbDocument = one searchable unit. Long texts are split into multiple
 * chunks (chunk_index 0, 1, 2, ...) so that search results point to the
 * relevant section rather than an entire book.
 */
@Entity
@Table(name = "kb_document")
data class KbDocument(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = 0,

    // ─── Source identity ───
    @Column(name = "source_type", nullable = false, length = 20)
    var sourceType: String = "",        // bible | commentary | dictionary | devotion | genbook | library

    @Column(name = "source_ref", nullable = false, length = 300)
    var sourceRef: String = "",          // unique path, e.g. "bible/cuv_gb/LUK/15/11-32"

    @Column(nullable = false, length = 500)
    var title: String = "",

    @Column(nullable = false, columnDefinition = "TEXT")
    var content: String = "",            // full original text (for display)

    @Column(name = "content_hash", nullable = false, length = 64)
    var contentHash: String = "",

    // ─── Chunking ───
    @Column(name = "chunk_index")
    var chunkIndex: Int = 0,

    @Column(name = "chunk_text", columnDefinition = "TEXT")
    var chunkText: String? = null,       // text used for embedding (may differ from content)

    @Column(name = "parent_ref", length = 300)
    var parentRef: String? = null,

    // ─── Bible metadata ───
    @Column(name = "translation", length = 20)
    var translation: String? = null,

    @Column(name = "book", length = 10)
    var book: String? = null,

    @Column(name = "book_name", length = 50)
    var bookName: String? = null,

    @Column(name = "chapter")
    var chapter: Int? = null,

    @Column(name = "verse_start")
    var verseStart: Int? = null,

    @Column(name = "verse_end")
    var verseEnd: Int? = null,

    @Column(name = "display_ref", length = 100)
    var displayRef: String? = null,

    // ─── Commentary / Dictionary metadata ───
    @Column(name = "module", length = 50)
    var module: String? = null,

    @Column(name = "module_name", length = 200)
    var moduleName: String? = null,

    @Column(length = 100)
    var author: String? = null,

    @Column(name = "verse_ref", length = 20)
    var verseRef: String? = null,

    // ─── Dictionary metadata ───
    @Column(name = "entry_key", length = 200)
    var entryKey: String? = null,

    // ─── Devotion metadata ───
    @Column(name = "date_key", length = 10)
    var dateKey: String? = null,

    // ─── Library metadata ───
    @Column(name = "book_code", length = 50)
    var bookCode: String? = null,

    @Column(length = 50)
    var category: String? = null,

    // ─── Common ───
    @Column(length = 10)
    var language: String = "zh",

    // ─── Vector index status (per model) ───
    @Column(name = "vec_id_tfidf", length = 100)
    var vecIdTfidf: String? = null,

    @Column(name = "vec_id_bgesmall", length = 100)
    var vecIdBgesmall: String? = null,

    @Column(name = "vec_id_bgebase", length = 100)
    var vecIdBgebase: String? = null,

    @Column(name = "is_indexed_tfidf")
    var isIndexedTfidf: Boolean = false,

    @Column(name = "is_indexed_bgesmall")
    var isIndexedBgesmall: Boolean = false,

    @Column(name = "is_indexed_bgebase")
    var isIndexedBgebase: Boolean = false,

    @Column(name = "created_at")
    var createdAt: Timestamp = Timestamp(System.currentTimeMillis()),

    @Column(name = "updated_at")
    var updatedAt: Timestamp = Timestamp(System.currentTimeMillis())
) {
    /**
     * Get the Zvec collection name for a given model + this document's source type.
     */
    fun collectionName(modelId: String): String = "${modelId}_${sourceType}"

    /**
     * Get the vector ID for a given model.
     */
    fun vecId(modelId: String): String? = when (modelId) {
        "tfidf_256" -> vecIdTfidf
        "bgesmall_512" -> vecIdBgesmall
        "bgebase_768" -> vecIdBgebase
        else -> null
    }

    /**
     * Set the vector ID for a given model.
     */
    fun setVecId(modelId: String, id: String?) {
        when (modelId) {
            "tfidf_256" -> { vecIdTfidf = id; isIndexedTfidf = id != null }
            "bgesmall_512" -> { vecIdBgesmall = id; isIndexedBgesmall = id != null }
            "bgebase_768" -> { vecIdBgebase = id; isIndexedBgebase = id != null }
        }
    }
}
