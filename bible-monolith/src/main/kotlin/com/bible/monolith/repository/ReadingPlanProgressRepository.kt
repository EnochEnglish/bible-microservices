package com.bible.monolith.repository

import com.bible.monolith.model.ReadingPlanProgress
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface ReadingPlanProgressRepository : JpaRepository<ReadingPlanProgress, Long> {
    fun findByUserIdAndPlanCode(userId: String, planCode: String): List<ReadingPlanProgress>
    fun findByUserIdAndPlanCodeAndDayNumber(userId: String, planCode: String, dayNumber: Int): ReadingPlanProgress?
    fun deleteByUserIdAndPlanCode(userId: String, planCode: String)
}
