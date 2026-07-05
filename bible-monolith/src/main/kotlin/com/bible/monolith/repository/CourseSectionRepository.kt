package com.bible.monolith.repository

import com.bible.monolith.model.CourseSection
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface CourseSectionRepository : JpaRepository<CourseSection, Long> {
    fun findByCourseIdOrderByOrderIndex(courseId: Long): List<CourseSection>
    fun deleteByCourseId(courseId: Long)
}
