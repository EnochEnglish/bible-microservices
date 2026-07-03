package com.bible.monolith.model

import jakarta.persistence.*
import java.time.Instant

/**
 * 考试提交记录
 */
@Entity
@Table(name = "course_exam_results", indexes = [
    Index(name = "idx_exam_result_user", columnList = "user_id"),
    Index(name = "idx_exam_result_exam", columnList = "exam_id"),
    Index(name = "idx_exam_result_uk", columnList = "user_id,exam_id,attempt_number", unique = true)
])
data class CourseExamResult(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(name = "exam_id", nullable = false)
    val examId: Long,

    @Column(name = "course_id", nullable = false)
    val courseId: Long,

    /** 第几次尝试（从1开始） */
    @Column(name = "attempt_number")
    val attemptNumber: Int = 1,

    /** 得分 */
    val score: Int = 0,

    /** 用户答案（JSON） */
    @Column(columnDefinition = "TEXT")
    val answers: String? = null,

    /** 是否通过 */
    val passed: Boolean = false,

    @Column(name = "started_at")
    val startedAt: Instant? = null,

    @Column(name = "submitted_at", nullable = false)
    val submittedAt: Instant = Instant.now(),

    @Column(name = "time_spent_minutes")
    val timeSpentMinutes: Int? = 0
)
