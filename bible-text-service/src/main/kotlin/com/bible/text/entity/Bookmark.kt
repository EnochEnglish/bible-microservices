package com.bible.text.entity

import jakarta.persistence.*
import java.time.Instant

/**
 * 经文高亮/书签
 *
 * 用户可以对经文添加颜色标记/书签
 */
@Entity
@Table(name = "bookmarks", indexes = [
    Index(name = "idx_bookmarks_verse", columnList = "verse_ref")
])
data class Bookmark(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    /** 经文引用，格式: "kjv:GEN:1:1" */
    @Column(name = "verse_ref", nullable = false, length = 50)
    val verseRef: String,

    /** 颜色代码，如 "#ffeb3b", "yellow", "red" */
    @Column(length = 20)
    val color: String? = null,

    /** 书签备注（可选） */
    @Column(columnDefinition = "TEXT")
    val note: String? = null,

    /** 创建时间 */
    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
)
