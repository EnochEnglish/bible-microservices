package com.bible.monolith.model

import jakarta.persistence.*
import java.time.Instant

/**
 * 课程模块章节 — 一个 Section 包含多个 Lesson
 */
@Entity
@Table(name = "course_lessons", indexes = [
    Index(name = "idx_lesson_section", columnList = "section_id")
])
data class CourseLesson(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(name = "section_id", nullable = false)
    val sectionId: Long,

    @Column(nullable = false, length = 200)
    val title: String,

    @Column(name = "title_en", length = 200)
    val titleEn: String? = null,

    /** 课时类型：article / video / quiz / assignment */
    @Column(nullable = false, length = 20)
    val lessonType: String = "article",

    /** 正文（Markdown/HTML） */
    @Column(columnDefinition = "TEXT")
    val content: String? = null,

    /** YouTube 视频 ID 或 URL */
    @Column(name = "video_url", length = 500)
    val videoUrl: String? = null,

    /** 预计学习时长（分钟） */
    @Column(name = "duration_minutes")
    val durationMinutes: Int? = null,

    val orderIndex: Int = 0,

    /** Lesson 内测验（JSON 数组） */
    @Column(name = "quiz_data", columnDefinition = "TEXT")
    val quizData: String? = null,

    /** 及格分数（百分比，0-100） */
    @Column(name = "passing_score")
    val passingScore: Int? = 60,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    val updatedAt: Instant = Instant.now()
)
