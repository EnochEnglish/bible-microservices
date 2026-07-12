package com.bible.monolith.controller

import com.bible.monolith.security.JwtUtil
import com.bible.monolith.service.CourseService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

/**
 * 课题提取 API — 从课程内容自动提取填空题/选择题
 * Lesson Question Extraction API
 *
 * 支持的填空模式:
 * 1. ____ 下划线填空
 * 2. （  ）中文括号填空（全角/半角空格）
 * 3. () 英文括号填空
 * 4. 是（）不是（） 选择题模式
 * 5. 是()不是() 选择题模式
 */
@RestController
@RequestMapping("/api/v1/courses")
class LessonQuestionController(
    private val courseService: CourseService,
    private val jwtUtil: JwtUtil
) {

    /**
     * GET /api/v1/courses/{courseId}/lessons/{lessonId}/questions
     * 从课程内容自动提取填空题，返回结构化题目列表（预览模式，不创建考试）
     */
    @GetMapping("/{courseId}/lessons/{lessonId}/questions")
    fun extractQuestions(
        @PathVariable courseId: Long,
        @PathVariable lessonId: Long
    ): ResponseEntity<Map<String, Any>> {
        val lesson = courseService.getLesson(lessonId)
            ?: return ResponseEntity.status(404).body(mapOf("error" to "Lesson not found"))

        val content = lesson.content ?: ""
        val questions = extractQuestionsFromContent(content)

        return ResponseEntity.ok(mapOf(
            "lessonId" to lessonId,
            "courseId" to courseId,
            "lessonTitle" to lesson.title,
            "questionCount" to questions.size,
            "questions" to questions
        ))
    }

    /**
     * POST /api/v1/courses/{courseId}/lessons/{lessonId}/exam-from-content
     * 从课程内容提取题目并直接创建考试
     */
    @PostMapping("/{courseId}/lessons/{lessonId}/exam-from-content")
    fun createExamFromContent(
        @RequestHeader("Authorization") auth: String,
        @PathVariable courseId: Long,
        @PathVariable lessonId: Long,
        @RequestBody body: ExamFromContentRequest
    ): ResponseEntity<Any> {
        val lesson = courseService.getLesson(lessonId)
            ?: return ResponseEntity.status(404).body(mapOf("error" to "Lesson not found"))

        val content = lesson.content ?: ""
        val questions = extractQuestionsFromContent(content)

        if (questions.isEmpty()) {
            return ResponseEntity.badRequest().body(mapOf("error" to "No questions found in lesson content"))
        }

        val examTitle = body.title ?: "${lesson.title} - 随堂测验"
        val questionsJson = serializeQuestions(questions)

        val createReq = com.bible.monolith.dto.CreateExamRequest(
            title = examTitle,
            titleEn = null,
            description = "Auto-extracted from lesson: ${lesson.title}",
            examType = "quiz",
            sectionId = lesson.sectionId,
            questions = questionsJson,
            totalScore = questions.sumOf { it["score"] as Int },
            passingScore = body.passingScore ?: 60,
            timeLimitMinutes = body.timeLimitMinutes,
            maxAttempts = body.maxAttempts,
            orderIndex = 0
        )

        val exam = courseService.createExam(courseId, createReq)
        return ResponseEntity.ok(exam)
    }

    // ─── Question Extraction Logic ───

    private fun extractQuestionsFromContent(content: String): List<Map<String, Any>> {
        val questions = mutableListOf<Map<String, Any>>()
        var questionIndex = 0

        // Pattern 1: 是（）不是（） or 是()不是() → single_choice
        val choiceRegex = Regex("是[（(]\\s*[^）)]*\\s*[）)]\\s*不是[（(]\\s*[^）)]*\\s*[）)]")
        val choiceMatches = choiceRegex.findAll(content).toList()
        for (match in choiceMatches) {
            val fullText = match.value
            val innerRegex = Regex("是[（(]\\s*([^）)]*)\\s*[）)]\\s*不是[（(]\\s*([^）)]*)\\s*[）)]")
            val innerMatch = innerRegex.find(fullText)
            val optA = innerMatch?.groupValues?.get(1)?.trim() ?: ""
            val optB = innerMatch?.groupValues?.get(2)?.trim() ?: ""
            questionIndex++
            questions.add(mapOf(
                "type" to "single_choice",
                "question" to fullText,
                "options" to listOf(optA, optB),
                "answer" to "A",
                "score" to 5,
                "sourceText" to fullText,
                "index" to questionIndex
            ))
        }

        // Remove choice patterns from content before looking for fill-blanks
        val contentWithoutChoices = choiceRegex.replace(content, "")

        // Pattern 2: ____ (2+ underscores) → fill_blank
        val underscoreRegex = Regex("_{2,}")
        val underscoreMatches = underscoreRegex.findAll(contentWithoutChoices).toList()
        for (match in underscoreMatches) {
            questionIndex++
            val start = (match.range.first - 60).coerceAtLeast(0)
            val end = (match.range.last + 60).coerceAtMost(contentWithoutChoices.length - 1)
            val context = contentWithoutChoices.substring(start, end + 1).trim()

            questions.add(mapOf(
                "type" to "fill_blank",
                "question" to "...${context}...",
                "answer" to "",
                "score" to 5,
                "sourceText" to match.value,
                "index" to questionIndex
            ))
        }

        // Pattern 3: （  ） Chinese full-width brackets with space → fill_blank
        val cjkBracketRegex = Regex("[（(]\\s{0,4}[）)]")
        val cjkMatches = cjkBracketRegex.findAll(contentWithoutChoices).toList()
        for (match in cjkMatches) {
            val before = contentWithoutChoices.substring(
                (match.range.first - 10).coerceAtLeast(0),
                match.range.first
            )
            if (before.contains("是") && before.contains("不是")) continue

            questionIndex++
            val start = (match.range.first - 60).coerceAtLeast(0)
            val end = (match.range.last + 60).coerceAtMost(contentWithoutChoices.length - 1)
            val context = contentWithoutChoices.substring(start, end + 1).trim()

            questions.add(mapOf(
                "type" to "fill_blank",
                "question" to "...${context}...",
                "answer" to "",
                "score" to 5,
                "sourceText" to match.value,
                "index" to questionIndex
            ))
        }

        return questions
    }

    /**
     * Serialize questions list to JSON string (compatible with exam.questions format)
     */
    private fun serializeQuestions(questions: List<Map<String, Any>>): String {
        val sb = StringBuilder("[")
        questions.forEachIndexed { idx, q ->
            if (idx > 0) sb.append(",")
            sb.append("{")
            sb.append("\"type\":\"").append(q["type"]).append("\"")
            sb.append(",\"question\":\"").append(escapeJson(q["question"] as String)).append("\"")
            sb.append(",\"score\":").append(q["score"])
            if (q.containsKey("answer")) {
                sb.append(",\"answer\":\"").append(escapeJson(q["answer"] as String)).append("\"")
            }
            if (q.containsKey("options")) {
                @Suppress("UNCHECKED_CAST")
                val opts = q["options"] as List<String>
                sb.append(",\"options\":[")
                opts.forEachIndexed { oi, opt ->
                    if (oi > 0) sb.append(",")
                    sb.append("\"").append(escapeJson(opt)).append("\"")
                }
                sb.append("]")
            }
            sb.append("}")
        }
        sb.append("]")
        return sb.toString()
    }

    private fun escapeJson(s: String): String {
        return s.replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "")
            .replace("\t", "\\t")
    }
}

/** Request body for creating exam from lesson content */
data class ExamFromContentRequest(
    val title: String? = null,
    val passingScore: Int? = null,
    val timeLimitMinutes: Int? = null,
    val maxAttempts: Int? = null
)
