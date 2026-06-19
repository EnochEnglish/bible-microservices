package com.bible.monolith.model

import jakarta.persistence.*
import java.time.Instant

/**
 * 个人学习笔记 — 用户绑定
 */
@Entity
@Table(name = "notes", indexes = [
    Index(name = "idx_notes_verse", columnList = "verse_ref"),
    Index(name = "idx_notes_user", columnList = "user_id")
])
data class Note(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    /** User identifier (JWT "sub" claim / username) */
    @Column(name = "user_id", nullable = false, length = 50)
    val userId: String,

    /** 经文引用 */
    @Column(name = "verse_ref", nullable = false, length = 50)
    val verseRef: String,

    /** 笔记标题（可选） */
    @Column(length = 200)
    val title: String? = null,

    /** 笔记内容 */
    @Column(nullable = false, columnDefinition = "TEXT")
    val content: String,

    /** 创建时间 */
    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now(),

    /** 更新时间 */
    @Column(name = "updated_at", nullable = false)
    val updatedAt: Instant = Instant.now()
)
