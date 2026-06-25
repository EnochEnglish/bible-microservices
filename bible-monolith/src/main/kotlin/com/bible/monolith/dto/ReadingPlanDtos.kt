package com.bible.monolith.dto

/**
 * 读经计划 DTO
 */
data class ReadingPlanDto(
    val planCode: String,
    val planName: String,
    val planDescription: String,
    val numberOfDays: Int,
    val versification: String = "KJV",
    val dateBased: Boolean = true
)

data class DayReadingDto(
    val day: Int,
    val readings: List<ReadingItemDto>,
    val date: String? = null
)

data class ReadingItemDto(
    val ref: String,
    val bookId: String,
    val chapterStart: Int,
    val chapterEnd: Int,
    val label: String
)

data class ProgressDto(
    val day: Int,
    val readCount: Int,
    val completed: Boolean
)

data class ProgressUpdateDto(
    val planCode: String,
    val day: Int,
    val readCount: Int? = null,
    val completed: Boolean? = null
)

data class PlanStatusDto(
    val planCode: String,
    val currentDay: Int,
    val totalDays: Int,
    val completedDays: Int,
    val progress: List<ProgressDto>
)
