package com.bible.monolith.repository

import com.bible.monolith.model.CourseLessonProgress
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface CourseLessonProgressRepository : JpaRepository<CourseLessonProgress, Long> {
    fun findByUserIdAndCourseId(userId: Long, courseId: Long): List<CourseLessonProgress>
    fun findByUserIdAndLessonId(userId: Long, lessonId: Long): Optional<CourseLessonProgress>
    fun countByUserIdAndCourseIdAndCompleted(userId: Long, courseId: Long, completed: Boolean): Int
}
