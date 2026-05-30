package com.bible.text.entity

import jakarta.persistence.*

/**
 * 公共注释书（如 Matthew Henry、Gill 等）
 *
 * 注释书按经文范围索引，支持整章或单节注释
 */
@Entity
@Table(name = "commentaries", indexes = [
    Index(name = "idx_commentary_lookup", columnList = "source, book_id, chapter, verse_start")
])
data class Commentary(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    /** 注释来源，如 "matthew_henry", "gill", "wesley" */
    @Column(nullable = false, length = 50)
    val source: String,

    /** 注释书名称 */
    @Column(nullable = false, length = 100)
    val sourceName: String,

    /** 书卷 ID（如 "GEN", "JHN"） */
    @Column(name = "book_id", nullable = false, length = 10)
    val bookId: String,

    /** 章节 */
    @Column(nullable = false)
    val chapter: Int,

    /** 起始节（0 表示整章注释） */
    @Column(name = "verse_start", nullable = false)
    val verseStart: Int,

    /** 结束节（与 verseStart 相同表示单节） */
    @Column(name = "verse_end", nullable = false)
    val verseEnd: Int,

    /** 注释内容（HTML 或纯文本） */
    @Column(nullable = false, columnDefinition = "TEXT")
    val text: String
)
