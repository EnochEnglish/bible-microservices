package com.bible.monolith.repository

import com.bible.monolith.model.CourseExamResult
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface CourseExamResultRepository : JpaRepository<CourseExamResult, Long> {
    fun findByUserIdAndExamIdOrderByAttemptNumberDesc(userId: Long, examId: Long): List<CourseExamResult>
    fun findByExamId(examId: Long): List<CourseExamResult>
    fun countByUserIdAndExamId(userId: Long, examId: Long): Int
}
