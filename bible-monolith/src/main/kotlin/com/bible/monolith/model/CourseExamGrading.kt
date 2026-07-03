package com.bible.monolith.model

import jakarta.persistence.*
import java.time.Instant

/**
 * 主观题教师评分记录 — 每个学生的每道主观题
 */
@Entity
@Table(name = "course_exam_gradings", indexes = [
    Index(name = "idx_grading_result", columnList = "result_id"),
    Index(name = "idx_grading_grader", columnList = "grader_id"),
    Index(name = "idx_grading_status", columnList = "status")
])
data class CourseExamGrading(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(name = "result_id", nullable = false)
    val resultId: Long,

    @Column(name = "question_index", nullable = false)
    val questionIndex: Int,

    /** 学生答案 */
    @Column(name = "student_answer", columnDefinition = "TEXT")
    val studentAnswer: String? = null,

    /** 教师评分 */
    @Column(name = "teacher_score")
    val teacherScore: Int? = null,

    /** 教师批注 */
    @Column(name = "teacher_comment", columnDefinition = "TEXT")
    val teacherComment: String? = null,

    /** 评分教师 User.id */
    @Column(name = "grader_id")
    val graderId: Long? = null,

    /** pending / graded / dispute */
    @Column(nullable = false, length = 20)
    val status: String = "pending",

    @Column(name = "graded_at")
    val gradedAt: Instant? = null,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
)
