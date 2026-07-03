package com.bible.monolith.model

import jakarta.persistence.*
import java.time.Instant

/**
 * 课时完成记录
 */
@Entity
@Table(name = "course_lesson_progress", indexes = [
    Index(name = "idx_lesson_progress_user", columnList = "user_id"),
    Index(name = "idx_lesson_progress_lesson", columnList = "lesson_id"),
    Index(name = "idx_lesson_progress_uk", columnList = "user_id,lesson_id", unique = true)
])
data class CourseLessonProgress(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(name = "lesson_id", nullable = false)
    val lessonId: Long,

    @Column(name = "course_id", nullable = false)
    val courseId: Long,

    val completed: Boolean = false,

    @Column(name = "completed_at")
    val completedAt: Instant? = null,

    @Column(name = "time_spent_minutes")
    val timeSpentMinutes: Int = 0,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
)
