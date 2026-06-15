package com.bible.text.entity

import jakarta.persistence.*
import java.time.Instant

/**
 * 经文高亮/书签 — 用户绑定
 */
@Entity
@Table(name = "bookmarks", indexes = [
    Index(name = "idx_bookmarks_verse", columnList = "verse_ref"),
    Index(name = "idx_bookmarks_user", columnList = "user_id")
])
data class Bookmark(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    /** User identifier (JWT "sub" claim / username) */
    @Column(name = "user_id", nullable = false, length = 50)
    val userId: String,

    /** 经文引用，格式: "GEN:1:1" or "kjv:GEN:1:1" */
    @Column(name = "verse_ref", nullable = false, length = 50)
    val verseRef: String,

    /** 颜色代码 */
    @Column(length = 20)
    val color: String? = null,

    /** 书签备注（可选） */
    @Column(columnDefinition = "TEXT")
    val note: String? = null,

    /** 创建时间 */
    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
)
