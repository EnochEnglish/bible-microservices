package com.bible.monolith.model

import jakarta.persistence.*

/**
 * 逐词标注（Interlinear / Strong's Numbers）
 *
 * 每个词对应一节经文中的一个英文词或词组，
 * 带有 Strong's 编号、希腊/希伯来原文和形态学编码
 */
@Entity
@Table(name = "words", indexes = [
    Index(name = "idx_words_verse", columnList = "verse_id"),
    Index(name = "idx_words_strongs", columnList = "strongs")
])
data class Word(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verse_id", nullable = false)
    val verse: Verse,

    @Column(nullable = false)
    val position: Int,            // src 属性值，词在经节中的序号

    @Column(nullable = false)
    val text: String,             // 英文词文本

    @Column
    val strongs: String? = null,  // Strong's 编号，如 "G4074", "H7225"

    @Column(columnDefinition = "VARCHAR(500)")
    val lemma: String? = null,    // 希腊/希伯来原文，如 "πετρος"

    @Column
    val morphology: String? = null, // Robinson 形态编码，如 "N-NSM"

    @Column(name = "is_parenthetical")
    val isParenthetical: Boolean = false  // src="5p" 格式的插入语
)
