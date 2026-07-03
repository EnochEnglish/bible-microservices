package com.bible.monolith.repository

import com.bible.monolith.model.CourseEnrollment
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface CourseEnrollmentRepository : JpaRepository<CourseEnrollment, Long> {
    fun findByUserId(userId: Long): List<CourseEnrollment>
    fun findByCourseId(courseId: Long): List<CourseEnrollment>
    fun findByUserIdAndCourseId(userId: Long, courseId: Long): Optional<CourseEnrollment>
    fun countByCourseId(courseId: Long): Long
}
