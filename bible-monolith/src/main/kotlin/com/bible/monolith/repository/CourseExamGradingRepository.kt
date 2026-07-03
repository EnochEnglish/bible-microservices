package com.bible.monolith.repository

import com.bible.monolith.model.CourseExamGrading
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface CourseExamGradingRepository : JpaRepository<CourseExamGrading, Long> {
    fun findByResultId(resultId: Long): List<CourseExamGrading>
    fun findByGraderIdAndStatus(graderId: Long, status: String): List<CourseExamGrading>
    fun findByStatus(status: String): List<CourseExamGrading>
    fun countByResultIdAndStatus(resultId: Long, status: String): Int
}
