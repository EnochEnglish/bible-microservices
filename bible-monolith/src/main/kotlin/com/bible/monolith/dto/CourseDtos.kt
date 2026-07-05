package com.bible.monolith.dto

import java.time.Instant

data class CourseDto(
    val id: Long, val title: String, val titleEn: String?,
    val description: String?, val descriptionEn: String?,
    val instructorId: Long, val category: String?, val icon: String?,
    val difficulty: String?, val estimatedHours: Int?,
    val price: Int, val currency: String, val status: String,
    val enrollmentCount: Int, val rating: Double?,
    val domain: String, val organization: String?, val tags: String?,
    val createdAt: Instant, val updatedAt: Instant
)

data class CourseDetailDto(
    val course: CourseDto,
    val sections: List<SectionDto>,
    val exams: List<ExamListDto>
)

data class SectionDto(
    val id: Long, val courseId: Long,
    val title: String, val titleEn: String?,
    val orderIndex: Int,
    val lessons: List<LessonDto>
)

data class LessonDto(
    val id: Long, val sectionId: Long,
    val title: String, val titleEn: String?,
    val lessonType: String,
    val content: String?, val videoUrl: String?,
    val durationMinutes: Int?, val orderIndex: Int,
    val passingScore: Int?
)

data class ExamListDto(
    val id: Long, val courseId: Long,
    val title: String, val titleEn: String?,
    val examType: String, val sectionId: Long?,
    val passingScore: Int?, val totalScore: Int?,
    val timeLimitMinutes: Int?, val maxAttempts: Int?,
    val orderIndex: Int
)

data class ExamQuestionDto(
    val id: Long, val courseId: Long,
    val title: String, val titleEn: String?,
    val examType: String, val sectionId: Long?,
    val questions: String, // JSON
    val timeLimitMinutes: Int?, val passingScore: Int?,
    val totalScore: Int?, val maxAttempts: Int?
)

data class EnrollmentDto(
    val id: Long, val userId: Long, val courseId: Long,
    val progressPct: Int, val status: String,
    val completedAt: Instant?, val certificateIssued: Boolean,
    val enrolledAt: Instant
)

data class LessonProgressDto(
    val userId: Long, val lessonId: Long, val courseId: Long,
    val completed: Boolean, val completedAt: Instant?,
    val timeSpentMinutes: Int
)

data class ExamSubmissionDto(
    val answers: String
)

data class ExamResultDto(
    val id: Long, val userId: Long, val examId: Long, val courseId: Long,
    val attemptNumber: Int, val score: Int, val passed: Boolean,
    val submittedAt: Instant, val timeSpentMinutes: Int?
)

data class GradingDto(
    val id: Long, val resultId: Long, val questionIndex: Int,
    val studentAnswer: String?,
    val teacherScore: Int?, val teacherComment: String?,
    val graderId: Long?, val status: String,
    val gradedAt: Instant?
)

data class GradingSubmitDto(
    val score: Int,
    val comment: String? = null
)

data class CertificateDto(
    val id: Long, val userId: Long, val courseId: Long,
    val certificateCode: String, val finalScore: Int?,
    val issuedAt: Instant, val expiresAt: Instant?
)

data class LessonTimeDto(
    val minutes: Int
)

// ─── Admin Create Requests ───

data class CreateCourseRequest(
    val title: String,
    val titleEn: String? = null,
    val description: String? = null,
    val descriptionEn: String? = null,
    val category: String? = null,
    val icon: String? = null,
    val difficulty: String? = null,
    val estimatedHours: Int? = null,
    val price: Int = 0,
    val currency: String = "CNY",
    val language: String = "zh",
    val domain: String = "theology",
    val organization: String? = null,
    val tags: String? = null,
    val isPublished: Boolean = false
)

data class CreateSectionRequest(
    val title: String,
    val titleEn: String? = null,
    val orderIndex: Int = 0
)

data class CreateLessonRequest(
    val title: String,
    val titleEn: String? = null,
    val lessonType: String = "text",
    val content: String? = null,
    val videoUrl: String? = null,
    val durationMinutes: Int? = null,
    val orderIndex: Int = 0,
    val passingScore: Int? = null
)

data class CreateExamRequest(
    val title: String,
    val titleEn: String? = null,
    val description: String? = null,
    val examType: String = "quiz",
    val sectionId: Long? = null,
    val questions: String = "[]",
    val totalScore: Int = 100,
    val passingScore: Int = 60,
    val timeLimitMinutes: Int? = null,
    val maxAttempts: Int? = null,
    val orderIndex: Int = 0
)
