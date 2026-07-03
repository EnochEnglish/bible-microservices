package com.bible.monolith.controller

import com.bible.monolith.dto.*
import com.bible.monolith.security.JwtUtil
import com.bible.monolith.service.CourseService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/courses")
class CourseController(
    private val courseService: CourseService,
    private val jwtUtil: JwtUtil
) {

    // ─── Public (browse) ───

    @GetMapping
    fun listCourses(@RequestParam(required = false) category: String?): List<CourseDto> {
        return courseService.listPublishedCourses(category)
    }

    @GetMapping("/{courseId}")
    fun getCourse(@PathVariable courseId: Long): ResponseEntity<CourseDetailDto> {
        val detail = courseService.getCourseDetail(courseId) ?: return ResponseEntity.status(404).body(null)
        return ResponseEntity.ok(detail)
    }

    // ─── Student: Enrollment ───

    @PostMapping("/{courseId}/enroll")
    fun enroll(
        @RequestHeader("Authorization") auth: String,
        @PathVariable courseId: Long
    ): EnrollmentDto {
        val userId = extractUserId(auth)
        return courseService.enroll(userId, courseId)
    }

    @GetMapping("/my/enrollments")
    fun myEnrollments(@RequestHeader("Authorization") auth: String): List<EnrollmentDto> {
        return courseService.getMyEnrollments(extractUserId(auth))
    }

    // ─── Student: Lessons ───

    @GetMapping("/{courseId}/lessons/{lessonId}")
    fun getLesson(
        @PathVariable courseId: Long,
        @PathVariable lessonId: Long
    ): ResponseEntity<LessonDto> {
        val lesson = courseService.getLesson(lessonId) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(lesson)
    }

    @PostMapping("/{courseId}/lessons/{lessonId}/complete")
    fun completeLesson(
        @RequestHeader("Authorization") auth: String,
        @PathVariable courseId: Long,
        @PathVariable lessonId: Long
    ): LessonProgressDto {
        return courseService.completeLesson(extractUserId(auth), courseId, lessonId)
    }

    @PostMapping("/{courseId}/lessons/{lessonId}/time")
    fun recordTime(
        @RequestHeader("Authorization") auth: String,
        @PathVariable courseId: Long,
        @PathVariable lessonId: Long,
        @RequestBody body: LessonTimeDto
    ): ResponseEntity<*> {
        courseService.recordLessonTime(extractUserId(auth), courseId, lessonId, body.minutes)
        return ResponseEntity.ok(mapOf("ok" to true))
    }

    @GetMapping("/{courseId}/progress")
    fun getProgress(
        @RequestHeader("Authorization") auth: String,
        @PathVariable courseId: Long
    ): List<LessonProgressDto> {
        return courseService.getLessonProgress(extractUserId(auth), courseId)
    }

    // ─── Student: Exams ───

    @GetMapping("/{courseId}/exams/{examId}")
    fun getExam(
        @PathVariable courseId: Long,
        @PathVariable examId: Long
    ): ResponseEntity<ExamQuestionDto> {
        val exam = courseService.getExam(examId) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(exam)
    }

    @PostMapping("/{courseId}/exams/{examId}/submit")
    fun submitExam(
        @RequestHeader("Authorization") auth: String,
        @PathVariable courseId: Long,
        @PathVariable examId: Long,
        @RequestBody body: ExamSubmissionDto
    ): ExamResultDto {
        return courseService.submitExam(extractUserId(auth), examId, body.answers)
    }

    @GetMapping("/{courseId}/exams/{examId}/results")
    fun myExamResults(
        @RequestHeader("Authorization") auth: String,
        @PathVariable courseId: Long,
        @PathVariable examId: Long
    ): List<ExamResultDto> {
        return courseService.getMyExamResults(extractUserId(auth), examId)
    }

    // ─── Teacher: Grading ───

    @GetMapping("/exams/{examId}/results/all")
    fun examResultsForTeacher(@PathVariable examId: Long): List<ExamResultDto> {
        return courseService.getExamResultsForTeacher(examId)
    }

    @GetMapping("/gradings/pending")
    fun pendingGradings(@RequestHeader("Authorization") auth: String): List<GradingDto> {
        return courseService.getPendingGradings(extractUserId(auth))
    }

    @PostMapping("/gradings/{gradingId}/grade")
    fun submitGrading(
        @RequestHeader("Authorization") auth: String,
        @PathVariable gradingId: Long,
        @RequestBody body: GradingSubmitDto
    ): GradingDto {
        return courseService.submitGrading(extractUserId(auth), gradingId, body.score, body.comment)
    }

    // ─── Certificates ───

    @GetMapping("/my/certificates")
    fun myCertificates(@RequestHeader("Authorization") auth: String): List<CertificateDto> {
        return courseService.getMyCertificates(extractUserId(auth))
    }

    @GetMapping("/certificates/verify/{code}")
    fun verifyCertificate(@PathVariable code: String): ResponseEntity<CertificateDto> {
        val cert = courseService.verifyCertificate(code) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(cert)
    }

    // ─── Admin: Create Course/Section/Lesson/Exam ───

    @PostMapping
    fun createCourse(
        @RequestHeader("Authorization") auth: String,
        @RequestBody body: CreateCourseRequest
    ): CourseDto {
        val userId = extractUserId(auth)
        return courseService.createCourse(userId, body)
    }

    @PostMapping("/{courseId}/sections")
    fun createSection(
        @PathVariable courseId: Long,
        @RequestBody body: CreateSectionRequest
    ): SectionDto {
        return courseService.createSection(courseId, body)
    }

    @PostMapping("/{courseId}/sections/{sectionId}/lessons")
    fun createLesson(
        @PathVariable courseId: Long,
        @PathVariable sectionId: Long,
        @RequestBody body: CreateLessonRequest
    ): LessonDto {
        return courseService.createLesson(courseId, sectionId, body)
    }

    @PostMapping("/{courseId}/exams")
    fun createExam(
        @PathVariable courseId: Long,
        @RequestBody body: CreateExamRequest
    ): ExamQuestionDto {
        return courseService.createExam(courseId, body)
    }

    // ─── Helpers ───

    private fun extractUserId(auth: String): Long {
        val token = auth.removePrefix("Bearer ")
        return jwtUtil.getUserId(token)
    }
}
