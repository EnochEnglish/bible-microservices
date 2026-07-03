package com.bible.monolith.repository

import com.bible.monolith.model.Course
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface CourseRepository : JpaRepository<Course, Long> {
    fun findByStatusOrderByCreatedAtDesc(status: String): List<Course>
    fun findByCategoryAndStatus(category: String, status: String): List<Course>
    fun findByInstructorId(instructorId: Long): List<Course>
}
