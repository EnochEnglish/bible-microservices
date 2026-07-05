package com.bible.monolith.repository

import com.bible.monolith.model.Course
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface CourseRepository : JpaRepository<Course, Long> {
    fun findByStatusOrderByCreatedAtDesc(status: String): List<Course>
    fun findByCategoryAndStatus(category: String, status: String): List<Course>
    fun findByInstructorId(instructorId: Long): List<Course>
    fun findByDomainAndStatusOrderByCreatedAtDesc(domain: String, status: String): List<Course>
    fun findByDomainAndCategoryAndStatus(domain: String, category: String, status: String): List<Course>
    fun findByStatusAndDomainInOrderByCreatedAtDesc(status: String, domains: List<String>): List<Course>
}
