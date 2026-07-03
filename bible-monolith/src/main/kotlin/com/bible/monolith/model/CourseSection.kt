package com.bible.monolith.model

import jakarta.persistence.*
import java.time.Instant

/**
 * 课程模块/章节 — 一门课包含多个 Section
 */
@Entity
@Table(name = "course_sections", indexes = [
    Index(name = "idx_section_course", columnList = "course_id")
])
data class CourseSection(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(name = "course_id", nullable = false)
    val courseId: Long,

    @Column(nullable = false, length = 200)
    val title: String,

    @Column(name = "title_en", length = 200)
    val titleEn: String? = null,

    val orderIndex: Int = 0,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
)
