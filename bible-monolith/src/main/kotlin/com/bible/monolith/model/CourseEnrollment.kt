package com.bible.monolith.model

import jakarta.persistence.*
import java.time.Instant

/**
 * 学员选课记录
 */
@Entity
@Table(name = "course_enrollments", indexes = [
    Index(name = "idx_enroll_user", columnList = "user_id"),
    Index(name = "idx_enroll_course", columnList = "course_id"),
    Index(name = "idx_enroll_uk", columnList = "user_id,course_id", unique = true)
])
data class CourseEnrollment(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(name = "course_id", nullable = false)
    val courseId: Long,

    /** 总进度百分比 0-100 */
    @Column(name = "progress_pct")
    val progressPct: Int = 0,

    /** enrolled / in_progress / completed / dropped */
    @Column(nullable = false, length = 20)
    val status: String = "enrolled",

    @Column(name = "completed_at")
    val completedAt: Instant? = null,

    @Column(name = "certificate_issued")
    val certificateIssued: Boolean = false,

    @Column(name = "enrolled_at", nullable = false)
    val enrolledAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    val updatedAt: Instant = Instant.now()
)
