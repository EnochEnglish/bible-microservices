package com.bible.text.entity

import jakarta.persistence.*

/**
 * 圣经书卷（如 创世记、诗篇、约翰福音）
 */
@Entity
@Table(name = "books")
data class Book(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "translation_id", nullable = false)
    val translation: Translation,

    @Column(nullable = false)
    val bookId: String,         // 如 "gen", "psa", "john"

    @Column(nullable = false)
    val name: String,           // 如 "Genesis", "Psalms", "John"

    @Column(nullable = false)
    val englishName: String,

    val osisId: String? = null, // OSIS 标准 ID

    @Column(nullable = false)
    val orderIndex: Int,        // 书卷顺序

    @Column(nullable = false)
    val chapterCount: Int        // 章节数
)