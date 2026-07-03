package com.bible.monolith.model

import jakarta.persistence.*
import java.time.Instant

/**
 * 课程最终考试 — 一门课多个考试（期中+期末+章节测验等）
 */
@Entity
@Table(name = "course_exams", indexes = [
    Index(name = "idx_exam_course", columnList = "course_id")
])
data class CourseExam(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(name = "course_id", nullable = false)
    val courseId: Long,

    @Column(nullable = false, length = 200)
    val title: String,

    @Column(name = "title_en", length = 200)
    val titleEn: String? = null,

    /** final / midterm / chapter */
    @Column(nullable = false, length = 20)
    val examType: String = "chapter",

    /** 关联 Section ID（章节测验时） */
    @Column(name = "section_id")
    val sectionId: Long? = null,

    /** 考试题目（JSON 数组） */
    @Column(name = "questions", nullable = false, columnDefinition = "TEXT")
    val questions: String,

    /** 考试时限（分钟），0=无限制 */
    @Column(name = "time_limit_minutes")
    val timeLimitMinutes: Int? = 0,

    /** 及格分数（百分比，0-100） */
    @Column(name = "passing_score")
    val passingScore: Int? = 60,

    /** 总分数 */
    @Column(name = "total_score")
    val totalScore: Int? = 100,

    /** 可重考次数，0=无限 */
    @Column(name = "max_attempts")
    val maxAttempts: Int? = 3,

    val orderIndex: Int = 0,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
)
