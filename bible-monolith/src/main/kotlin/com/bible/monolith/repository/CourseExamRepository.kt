package com.bible.monolith.repository

import com.bible.monolith.model.CourseExam
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface CourseExamRepository : JpaRepository<CourseExam, Long> {
    fun findByCourseIdOrderByOrderIndex(courseId: Long): List<CourseExam>
    fun findBySectionId(sectionId: Long): List<CourseExam>
}
