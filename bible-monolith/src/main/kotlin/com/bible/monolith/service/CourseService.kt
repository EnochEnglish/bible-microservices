package com.bible.monolith.service

import com.bible.monolith.dto.*
import com.bible.monolith.model.*
import com.bible.monolith.repository.*
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.*

@Service
class CourseService(
    private val courseRepo: CourseRepository,
    private val sectionRepo: CourseSectionRepository,
    private val lessonRepo: CourseLessonRepository,
    private val examRepo: CourseExamRepository,
    private val enrollmentRepo: CourseEnrollmentRepository,
    private val progressRepo: CourseLessonProgressRepository,
    private val examResultRepo: CourseExamResultRepository,
    private val gradingRepo: CourseExamGradingRepository,
    private val certRepo: CourseCertificateRepository
) {
    private val log = LoggerFactory.getLogger(CourseService::class.java)

    // ─── Courses ───

    fun listPublishedCourses(category: String?, domain: String?): List<CourseDto> {
        val courses = when {
            domain != null && category != null -> courseRepo.findByDomainAndCategoryAndStatus(domain, category, "published")
            domain != null -> courseRepo.findByDomainAndStatusOrderByCreatedAtDesc(domain, "published")
            category != null -> courseRepo.findByCategoryAndStatus(category, "published")
            else -> courseRepo.findByStatusOrderByCreatedAtDesc("published")
        }
        return courses.map { toDto(it) }
    }

    fun getCourse(courseId: Long): CourseDto? {
        return courseRepo.findById(courseId).map { toDto(it) }.orElse(null)
    }

    fun getCourseDetail(courseId: Long): CourseDetailDto? {
        val course = courseRepo.findById(courseId).orElse(null) ?: return null
        val sections = sectionRepo.findByCourseIdOrderByOrderIndex(courseId).map { section ->
            val lessons = lessonRepo.findBySectionIdOrderByOrderIndex(section.id).map { toLessonDto(it) }
            SectionDto(section.id, section.courseId, section.title, section.titleEn, section.orderIndex, lessons)
        }
        val exams = examRepo.findByCourseIdOrderByOrderIndex(courseId).map {
            ExamListDto(it.id, it.courseId, it.title, it.titleEn, it.examType, it.sectionId,
                it.passingScore, it.totalScore, it.timeLimitMinutes, it.maxAttempts, it.orderIndex)
        }
        return CourseDetailDto(toDto(course), sections, exams)
    }

    // ─── Admin: Create Course/Section/Lesson/Exam ───

    @Transactional
    fun deleteCourse(courseId: Long) {
        // Delete in order: gradings, exam results, exams, lesson progress, lessons, sections, enrollments, certificates, course
        examRepo.findByCourseIdOrderByOrderIndex(courseId).forEach { exam ->
            examResultRepo.findByExamId(exam.id).forEach { result ->
                gradingRepo.deleteByResultId(result.id)
            }
            examResultRepo.deleteByExamId(exam.id)
        }
        examRepo.deleteByCourseId(courseId)
        sectionRepo.findByCourseIdOrderByOrderIndex(courseId).forEach { section ->
            lessonRepo.deleteBySectionId(section.id)
        }
        progressRepo.deleteByCourseId(courseId)
        sectionRepo.deleteByCourseId(courseId)
        enrollmentRepo.deleteByCourseId(courseId)
        certRepo.deleteByCourseId(courseId)
        courseRepo.deleteById(courseId)
    }

    fun getTeachingCourses(instructorId: Long): List<CourseDto> {
        return courseRepo.findByInstructorId(instructorId).map { toDto(it) }
    }

    @Transactional
    fun updateCourse(courseId: Long, req: CreateCourseRequest): CourseDto {
        val course = courseRepo.findById(courseId).orElseThrow { NoSuchElementException("Course not found") }
        val updated = course.copy(
            title = req.title,
            titleEn = req.titleEn,
            description = req.description,
            descriptionEn = req.descriptionEn,
            category = req.category,
            icon = req.icon,
            difficulty = req.difficulty,
            estimatedHours = req.estimatedHours,
            price = req.price,
            currency = req.currency,
            domain = req.domain ?: course.domain,
            organization = req.organization,
            tags = req.tags,
            status = if (req.isPublished) "published" else "draft",
            updatedAt = Instant.now()
        )
        return toDto(courseRepo.save(updated))
    }

    @Transactional
    fun updateSection(sectionId: Long, req: CreateSectionRequest): SectionDto {
        val section = sectionRepo.findById(sectionId).orElseThrow { NoSuchElementException("Section not found") }
        val updated = sectionRepo.save(section.copy(
            title = req.title,
            titleEn = req.titleEn,
            orderIndex = req.orderIndex
        ))
        return SectionDto(updated.id, updated.courseId, updated.title, updated.titleEn, updated.orderIndex, emptyList())
    }

    @Transactional
    fun deleteSection(sectionId: Long) {
        lessonRepo.deleteBySectionId(sectionId)
        sectionRepo.deleteById(sectionId)
    }

    @Transactional
    fun updateLesson(lessonId: Long, req: CreateLessonRequest): LessonDto {
        val lesson = lessonRepo.findById(lessonId).orElseThrow { NoSuchElementException("Lesson not found") }
        val updated = lessonRepo.save(lesson.copy(
            title = req.title,
            titleEn = req.titleEn,
            lessonType = req.lessonType,
            content = req.content,
            videoUrl = req.videoUrl,
            durationMinutes = req.durationMinutes,
            orderIndex = req.orderIndex,
            passingScore = req.passingScore
        ))
        return toLessonDto(updated)
    }

    @Transactional
    fun deleteLesson(lessonId: Long) {
        progressRepo.deleteByLessonId(lessonId)
        lessonRepo.deleteById(lessonId)
    }

    @Transactional
    fun updateExam(examId: Long, req: CreateExamRequest): ExamQuestionDto {
        val exam = examRepo.findById(examId).orElseThrow { NoSuchElementException("Exam not found") }
        val updated = examRepo.save(exam.copy(
            title = req.title,
            titleEn = req.titleEn,
            examType = req.examType,
            sectionId = req.sectionId,
            questions = req.questions,
            totalScore = req.totalScore,
            passingScore = req.passingScore,
            timeLimitMinutes = req.timeLimitMinutes,
            maxAttempts = req.maxAttempts,
            orderIndex = req.orderIndex
        ))
        return ExamQuestionDto(updated.id, updated.courseId, updated.title, updated.titleEn,
            updated.examType, updated.sectionId, updated.questions,
            updated.timeLimitMinutes, updated.passingScore, updated.totalScore, updated.maxAttempts)
    }

    @Transactional
    fun deleteExam(examId: Long) {
        examResultRepo.findByExamId(examId).forEach { result ->
            gradingRepo.deleteByResultId(result.id)
        }
        examResultRepo.deleteByExamId(examId)
        examRepo.deleteById(examId)
    }

    @Transactional
    fun createCourse(instructorId: Long, req: CreateCourseRequest): CourseDto {
        val course = Course(
            title = req.title,
            titleEn = req.titleEn,
            description = req.description,
            descriptionEn = req.descriptionEn,
            instructorId = instructorId,
            category = req.category,
            icon = req.icon,
            difficulty = req.difficulty,
            estimatedHours = req.estimatedHours,
            price = req.price,
            currency = req.currency,
            domain = req.domain ?: "theology",
            organization = req.organization,
            tags = req.tags,
            status = if (req.isPublished) "published" else "draft"
        )
        return toDto(courseRepo.save(course))
    }

    @Transactional
    fun createSection(courseId: Long, req: CreateSectionRequest): SectionDto {
        val section = sectionRepo.save(CourseSection(
            courseId = courseId,
            title = req.title,
            titleEn = req.titleEn,
            orderIndex = req.orderIndex
        ))
        return SectionDto(section.id, section.courseId, section.title, section.titleEn, section.orderIndex, emptyList())
    }

    @Transactional
    fun createLesson(courseId: Long, sectionId: Long, req: CreateLessonRequest): LessonDto {
        val lesson = lessonRepo.save(CourseLesson(
            sectionId = sectionId,
            title = req.title,
            titleEn = req.titleEn,
            lessonType = req.lessonType,
            content = req.content,
            videoUrl = req.videoUrl,
            durationMinutes = req.durationMinutes,
            orderIndex = req.orderIndex,
            passingScore = req.passingScore
        ))
        return toLessonDto(lesson)
    }

    @Transactional
    fun createExam(courseId: Long, req: CreateExamRequest): ExamQuestionDto {
        val exam = examRepo.save(CourseExam(
            courseId = courseId,
            title = req.title,
            titleEn = req.titleEn,
            examType = req.examType,
            sectionId = req.sectionId,
            questions = req.questions,
            totalScore = req.totalScore,
            passingScore = req.passingScore,
            timeLimitMinutes = req.timeLimitMinutes,
            maxAttempts = req.maxAttempts,
            orderIndex = req.orderIndex
        ))
        return ExamQuestionDto(exam.id, exam.courseId, exam.title, exam.titleEn,
            exam.examType, exam.sectionId, exam.questions,
            exam.timeLimitMinutes, exam.passingScore, exam.totalScore, exam.maxAttempts)
    }

    // ─── Enrollment ───

    @Transactional
    fun enroll(userId: Long, courseId: Long): EnrollmentDto {
        val existing = enrollmentRepo.findByUserIdAndCourseId(userId, courseId)
        if (existing.isPresent) return toEnrollmentDto(existing.get())

        val enrollment = enrollmentRepo.save(CourseEnrollment(userId = userId, courseId = courseId))
        val count = enrollmentRepo.countByCourseId(courseId)
        courseRepo.findById(courseId).ifPresent {
            courseRepo.save(it.copy(enrollmentCount = count.toInt()))
        }
        return toEnrollmentDto(enrollment)
    }

    fun getMyEnrollments(userId: Long): List<EnrollmentDto> {
        return enrollmentRepo.findByUserId(userId).map { toEnrollmentDto(it) }
    }

    fun getEnrollment(userId: Long, courseId: Long): EnrollmentDto? {
        return enrollmentRepo.findByUserIdAndCourseId(userId, courseId).map { toEnrollmentDto(it) }.orElse(null)
    }

    // ─── Lessons ───

    fun getLesson(lessonId: Long): LessonDto? {
        return lessonRepo.findById(lessonId).map { toLessonDto(it) }.orElse(null)
    }

    /** Mark lesson complete, recalculate progress */
    @Transactional
    fun completeLesson(userId: Long, courseId: Long, lessonId: Long): LessonProgressDto {
        val existing = progressRepo.findByUserIdAndLessonId(userId, lessonId)
        if (existing.isPresent && existing.get().completed) {
            val p = existing.get()
            return LessonProgressDto(p.userId, p.lessonId, p.courseId, true, p.completedAt, p.timeSpentMinutes)
        }

        val progress = if (existing.isPresent) {
            val p = existing.get()
            progressRepo.save(p.copy(completed = true, completedAt = Instant.now()))
        } else {
            progressRepo.save(CourseLessonProgress(
                userId = userId, lessonId = lessonId, courseId = courseId,
                completed = true, completedAt = Instant.now()
            ))
        }

        // Recalculate enrollment progress
        recalcProgress(userId, courseId)

        return LessonProgressDto(progress.userId, progress.lessonId, progress.courseId,
            progress.completed, progress.completedAt, progress.timeSpentMinutes)
    }

    /** Record time spent on a lesson (even if not completed) */
    @Transactional
    fun recordLessonTime(userId: Long, courseId: Long, lessonId: Long, minutes: Int) {
        val existing = progressRepo.findByUserIdAndLessonId(userId, lessonId)
        if (existing.isPresent) {
            val p = existing.get()
            progressRepo.save(p.copy(timeSpentMinutes = p.timeSpentMinutes + minutes))
        } else {
            progressRepo.save(CourseLessonProgress(
                userId = userId, lessonId = lessonId, courseId = courseId,
                completed = false, timeSpentMinutes = minutes
            ))
        }
    }

    fun getLessonProgress(userId: Long, courseId: Long): List<LessonProgressDto> {
        return progressRepo.findByUserIdAndCourseId(userId, courseId).map {
            LessonProgressDto(it.userId, it.lessonId, it.courseId, it.completed, it.completedAt, it.timeSpentMinutes)
        }
    }

    // ─── Exams ───

    fun getExam(examId: Long): ExamQuestionDto? {
        val exam = examRepo.findById(examId).orElse(null) ?: return null
        return ExamQuestionDto(exam.id, exam.courseId, exam.title, exam.titleEn,
            exam.examType, exam.sectionId, exam.questions,
            exam.timeLimitMinutes, exam.passingScore, exam.totalScore, exam.maxAttempts)
    }

    @Transactional
    fun submitExam(userId: Long, examId: Long, answers: String): ExamResultDto {
        val exam = examRepo.findById(examId).orElseThrow { NoSuchElementException("Exam not found") }
        val attemptCount = examResultRepo.countByUserIdAndExamId(userId, examId)

        // Check max attempts
        if (exam.maxAttempts != null && exam.maxAttempts!! > 0 && attemptCount >= exam.maxAttempts!!) {
            throw IllegalStateException("Max attempts (${exam.maxAttempts}) reached")
        }

        val result = gradeExam(userId, exam, answers, attemptCount + 1)
        val saved = examResultRepo.save(result)

        return toExamResultDto(saved)
    }

    fun getMyExamResults(userId: Long, examId: Long): List<ExamResultDto> {
        return examResultRepo.findByUserIdAndExamIdOrderByAttemptNumberDesc(userId, examId)
            .map { toExamResultDto(it) }
    }

    /** Teacher: list all results for an exam */
    fun getExamResultsForTeacher(examId: Long): List<ExamResultDto> {
        return examResultRepo.findByExamId(examId).map { toExamResultDto(it) }
    }

    // ─── Grading (Teacher) ───

    fun getPendingGradings(teacherId: Long? = null): List<GradingDto> {
        val gradings = if (teacherId != null)
            gradingRepo.findByGraderIdAndStatus(teacherId, "pending")
        else
            gradingRepo.findByStatus("pending")
        return gradings.map { toGradingDto(it) }
    }

    @Transactional
    fun submitGrading(graderId: Long, gradingId: Long, score: Int, comment: String?): GradingDto {
        val grading = gradingRepo.findById(gradingId).orElseThrow { NoSuchElementException("Grading not found") }
        val updated = gradingRepo.save(grading.copy(
            teacherScore = score,
            teacherComment = comment,
            graderId = graderId,
            status = "graded",
            gradedAt = Instant.now()
        ))
        // Check if all questions for this result are graded
        val allGraded = gradingRepo.countByResultIdAndStatus(updated.resultId, "pending") == 0
        if (allGraded) recalcExamResultAfterGrading(updated.resultId)
        return toGradingDto(updated)
    }

    // ─── Certificates ───

    fun getMyCertificates(userId: Long): List<CertificateDto> {
        return certRepo.findByUserId(userId).map { toCertDto(it) }
    }

    fun verifyCertificate(code: String): CertificateDto? {
        val cert = certRepo.findByCertificateCode(code).orElse(null) ?: return null
        return toCertDto(cert)
    }

    // ─── Private helpers ───

    private fun recalcProgress(userId: Long, courseId: Long) {
        val enrollment = enrollmentRepo.findByUserIdAndCourseId(userId, courseId).orElse(null) ?: return
        val totalLessons = sectionRepo.findByCourseIdOrderByOrderIndex(courseId)
            .sumOf { lessonRepo.countBySectionId(it.id) }
        if (totalLessons == 0) return
        val completed = progressRepo.countByUserIdAndCourseIdAndCompleted(userId, courseId, true)
        val pct = (completed * 100) / totalLessons
        val newStatus = if (pct >= 100) "completed" else "in_progress"
        enrollmentRepo.save(enrollment.copy(
            progressPct = pct,
            status = newStatus,
            completedAt = if (pct >= 100) Instant.now() else enrollment.completedAt,
            updatedAt = Instant.now()
        ))
    }

    private fun gradeExam(userId: Long, exam: CourseExam, answers: String, attempt: Int): CourseExamResult {
        // Parse questions JSON
        val questions = try {
            parseQuestions(exam.questions)
        } catch (e: Exception) {
            log.error("Failed to parse exam questions: examId={}", exam.id, e)
            return CourseExamResult(userId = userId, examId = exam.id, courseId = exam.courseId,
                attemptNumber = attempt, score = 0, answers = answers, passed = false, submittedAt = Instant.now())
        }

        val userAnswers = try {
            parseAnswers(answers)
        } catch (e: Exception) {
            emptyList()
        }

        val totalScore = exam.totalScore ?: questions.sumOf { it.score }
        var autoScore = 0
        val gradings = mutableListOf<CourseExamGrading>()

        for ((idx, q) in questions.withIndex()) {
            val userAns = userAnswers.getOrNull(idx)
            when (q.type) {
                "single_choice" -> {
                    val correct = q.answer != null && userAns != null && userAns == q.answer.toString()
                    if (correct) autoScore += q.score
                }
                "multiple_choice" -> {
                    val correct = q.answers != null && userAns != null &&
                        userAns.split(",").map { it.trim() }.sorted() == q.answers!!.map { it.toString() }.sorted()
                    if (correct) autoScore += q.score
                }
                "true_false" -> {
                    val correct = q.answer != null && userAns != null &&
                        userAns.equals(q.answer.toString(), ignoreCase = true)
                    if (correct) autoScore += q.score
                }
                "fill_blank" -> {
                    val correct = q.answer != null && userAns != null &&
                        userAns.trim().equals(q.answer.toString().trim(), ignoreCase = true)
                    if (correct) autoScore += q.score
                }
                "short_answer", "essay" -> {
                    // Subjective — create grading record
                    gradings.add(CourseExamGrading(
                        resultId = 0, // will set after save
                        questionIndex = idx,
                        studentAnswer = userAns,
                        status = "pending",
                        createdAt = Instant.now()
                    ))
                }
            }
        }

        val scorePct = if (totalScore > 0) (autoScore * 100) / totalScore else 0
        val passingScore = exam.passingScore ?: 60

        val result = CourseExamResult(
            userId = userId, examId = exam.id, courseId = exam.courseId,
            attemptNumber = attempt, score = autoScore, answers = answers,
            passed = scorePct >= passingScore && gradings.isEmpty(), // only auto-pass if no subjective
            submittedAt = Instant.now()
        )
        val saved = examResultRepo.save(result)

        // Save gradings with correct resultId, pass null passed state (pending teacher)
        if (gradings.isNotEmpty()) {
            gradingRepo.saveAll(gradings.map { it.copy(resultId = saved.id) })
        }

        return saved
    }

    private fun recalcExamResultAfterGrading(resultId: Long) {
        val result = examResultRepo.findById(resultId).orElse(null) ?: return
        val exam = examRepo.findById(result.examId).orElse(null) ?: return
        val gradings = gradingRepo.findByResultId(resultId)
        val allGraded = gradings.all { it.status == "graded" }
        if (!allGraded) return

        val questions = try { parseQuestions(exam.questions) } catch (e: Exception) { return }
        val totalScore = exam.totalScore ?: questions.sumOf { it.score }
        val teacherScores = gradings.sumOf { it.teacherScore ?: 0 }
        val finalScore = result.score + teacherScores
        val scorePct = if (totalScore > 0) (finalScore * 100) / totalScore else 0
        val passingScore = exam.passingScore ?: 60
        val passed = scorePct >= passingScore

        examResultRepo.save(result.copy(score = finalScore, passed = passed))

        // Auto-issue certificate if all exams passed
        if (passed) autoIssueCertificate(result.userId, exam.courseId)
    }

    private fun autoIssueCertificate(userId: Long, courseId: Long) {
        val course = courseRepo.findById(courseId).orElse(null) ?: return
        val enrollment = enrollmentRepo.findByUserIdAndCourseId(userId, courseId).orElse(null) ?: return
        val exams = examRepo.findByCourseIdOrderByOrderIndex(courseId)

        // Check all exams are passed
        val allPassed = exams.all { exam ->
            val results = examResultRepo.findByUserIdAndExamIdOrderByAttemptNumberDesc(userId, exam.id)
            results.isNotEmpty() && results.first().passed
        }

        if (allPassed && enrollment.progressPct >= 100) {
            val existing = certRepo.findByUserIdAndCourseId(userId, courseId)
            if (existing.isEmpty()) {
                val code = "CERT-${courseId}-${userId}-${System.currentTimeMillis().toString().takeLast(8)}"
                val avgScore = exams.mapNotNull { exam ->
                    val results = examResultRepo.findByUserIdAndExamIdOrderByAttemptNumberDesc(userId, exam.id)
                    results.firstOrNull()?.let { it.score to (exam.totalScore ?: 100) }
                }.let { pairs ->
                    if (pairs.isEmpty()) null
                    else pairs.sumOf { it.first * 100 / it.second } / pairs.size
                }
                certRepo.save(CourseCertificate(
                    userId = userId, courseId = courseId,
                    certificateCode = code, finalScore = avgScore,
                    issuedBy = course.instructorId
                ))
                enrollmentRepo.save(enrollment.copy(certificateIssued = true, updatedAt = Instant.now()))
                log.info("Certificate issued: code={} userId={} courseId={}", code, userId, courseId)
            }
        }
    }

    private fun parseQuestions(json: String): List<QuestionItem> {
        val trim = json.trim()
        if (!trim.startsWith("[")) return emptyList()
        val items = mutableListOf<QuestionItem>()
        // Simple JSON parser (no external library needed for this structure)
        val parts = trim.removeSurrounding("[", "]").split(Regex("""\},\s*\{"""))
        for (part in parts) {
            val clean = part.trim().removeSurrounding("{", "}")
            val type = extractJsonString(clean, "type")
            val question = extractJsonString(clean, "question")
            val score = extractJsonInt(clean, "score")
            val answer = extractJsonString(clean, "answer")
            val answers = extractJsonArray(clean, "answers")
            val options = extractJsonArray(clean, "options")
            items.add(QuestionItem(type ?: "", question ?: "", score, answer, answers, options))
        }
        return items
    }

    private fun parseAnswers(json: String): List<String> {
        val trim = json.trim()
        if (!trim.startsWith("[")) return emptyList()
        val items = mutableListOf<String>()
        val parts = trim.removeSurrounding("[", "]").split(Regex("""",\s*""""))
        for (part in parts) {
            val clean = part.trim().removeSurrounding("\"")
            items.add(clean)
        }
        return items
    }

    private fun extractJsonString(json: String, key: String): String? {
        val pattern = """"$key"\s*:\s*"([^"]*)"""".toRegex()
        return pattern.find(json)?.groupValues?.get(1)
    }

    private fun extractJsonInt(json: String, key: String): Int {
        val pattern = """"$key"\s*:\s*(-?\d+)""".toRegex()
        return pattern.find(json)?.groupValues?.get(1)?.toIntOrNull() ?: 0
    }

    private fun extractJsonArray(json: String, key: String): List<String>? {
        val pattern = """"$key"\s*:\s*\[([^\]]*)\]""".toRegex()
        val match = pattern.find(json)?.groupValues?.get(1) ?: return null
        if (match.isBlank()) return emptyList()
        return match.split(",").map { it.trim().removeSurrounding("\"") }
    }

    // ─── DTO Mappers ───

    private fun toDto(c: Course) = CourseDto(c.id, c.title, c.titleEn, c.description, c.descriptionEn,
        c.instructorId, c.category, c.icon, c.difficulty, c.estimatedHours,
        c.price, c.currency, c.status, c.enrollmentCount, c.rating,
        c.domain, c.organization, c.tags,
        c.createdAt, c.updatedAt)

    private fun toLessonDto(l: CourseLesson) = LessonDto(l.id, l.sectionId, l.title, l.titleEn,
        l.lessonType, l.content, l.videoUrl, l.durationMinutes, l.orderIndex,
        l.passingScore)

    private fun toEnrollmentDto(e: CourseEnrollment) = EnrollmentDto(e.id, e.userId, e.courseId,
        e.progressPct, e.status, e.completedAt, e.certificateIssued, e.enrolledAt)

    private fun toExamResultDto(r: CourseExamResult) = ExamResultDto(r.id, r.userId, r.examId, r.courseId,
        r.attemptNumber, r.score, r.passed, r.submittedAt, r.timeSpentMinutes)

    private fun toGradingDto(g: CourseExamGrading) = GradingDto(g.id, g.resultId, g.questionIndex,
        g.studentAnswer, g.teacherScore, g.teacherComment, g.graderId, g.status, g.gradedAt)

    private fun toCertDto(c: CourseCertificate) = CertificateDto(c.id, c.userId, c.courseId,
        c.certificateCode, c.finalScore, c.issuedAt, c.expiresAt)
}

/** Question item parsed from exam JSON */
data class QuestionItem(
    val type: String,
    val question: String?,
    val score: Int,
    val answer: String?,
    val answers: List<String>?,
    val options: List<String>?
)
