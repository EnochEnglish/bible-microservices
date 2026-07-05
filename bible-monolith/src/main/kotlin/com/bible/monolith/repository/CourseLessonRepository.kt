package com.bible.monolith.repository

import com.bible.monolith.model.CourseLesson
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface CourseLessonRepository : JpaRepository<CourseLesson, Long> {
    fun findBySectionIdOrderByOrderIndex(sectionId: Long): List<CourseLesson>
    fun countBySectionId(sectionId: Long): Int
    fun deleteBySectionId(sectionId: Long)
}
