package com.bible.monolith.model

import jakarta.persistence.*

/**
 * 圣经字典条目（Easton, ISBE, Nave 等）
 * 与书卷/章节无关，按词条独立索引
 */
@Entity
@Table(name = "dictionaries", indexes = [
    Index(name = "idx_dict_source_entry", columnList = "source, entry_id", unique = true),
    Index(name = "idx_dict_source", columnList = "source")
])
data class DictionaryEntry(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    /** 字典来源，如 "easton", "isbe", "nave" */
    @Column(nullable = false, length = 50)
    val source: String,

    /** 字典来源显示名，如 "Easton's Bible Dictionary" */
    @Column(nullable = false, length = 100)
    val sourceName: String,

    /** 词条 key，如 "Aaron", "Aaronites" */
    @Column(name = "entry_id", nullable = false, length = 100)
    val entryId: String,

    /** 词条定义全文（HTML/纯文本） */
    @Column(nullable = false, columnDefinition = "TEXT")
    val definition: String
)
