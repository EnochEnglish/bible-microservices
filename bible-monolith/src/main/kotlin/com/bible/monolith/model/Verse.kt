package com.bible.monolith.model

import jakarta.persistence.*

/**
 * 圣经经文（节）
 */
@Entity
@Table(name = "verses", indexes = [
    Index(name = "idx_verse_lookup", columnList = "book_id, chapter, verse")
])
data class Verse(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id", nullable = false)
    val book: Book,

    @Column(nullable = false)
    val chapter: Int,

    @Column(nullable = false)
    val verse: Int,

    @Column(nullable = false, columnDefinition = "TEXT")
    val text: String,

    @Column(nullable = false)
    val verseKey: String  // 如 "gen.1.1" 用于唯一标识
)