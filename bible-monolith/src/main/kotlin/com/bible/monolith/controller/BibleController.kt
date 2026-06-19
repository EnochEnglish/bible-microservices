package com.bible.monolith.controller

import com.bible.monolith.service.BibleTextService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

/**
 * 经文查询 API
 *
 * 参考 bible-api.com 的 API 风格：
 * - GET /api/v1/bible/{translation}/{book}/{chapter}
 * - GET /api/v1/bible/{translation}/{book}/{chapter}/{verse}
 * - GET /api/v1/bible/{translation}/random
 * - GET /api/v1/bible/translations
 * - GET /api/v1/bible/{translation}/books
 * - POST /api/v1/bible/import （内部接口，供 module-service 调用）
 */
@RestController
@RequestMapping("/api/v1/bible")
class BibleController(
    private val bibleTextService: BibleTextService
) {

    /**
     * 获取整章经文
     */
    @GetMapping("/{translation}/{book}/{chapter}")
    fun getChapter(
        @PathVariable translation: String,
        @PathVariable book: String,
        @PathVariable chapter: Int
    ): ResponseEntity<Map<String, Any>> {
        val result = bibleTextService.getChapter(translation, book, chapter)
        return ResponseEntity.ok(result)
    }

    /**
     * 获取单节经文
     */
    @GetMapping("/{translation}/{book}/{chapter}/{verse}")
    fun getVerse(
        @PathVariable translation: String,
        @PathVariable book: String,
        @PathVariable chapter: Int,
        @PathVariable verse: Int
    ): ResponseEntity<Map<String, Any>> {
        val result = bibleTextService.getVerse(translation, book, chapter, verse)
        return ResponseEntity.ok(result)
    }

    /**
     * 获取经文范围
     */
    @GetMapping("/{translation}/range")
    fun getRange(
        @RequestParam book: String,
        @RequestParam chapter: Int,
        @RequestParam verseStart: Int,
        @RequestParam verseEnd: Int,
        @PathVariable translation: String
    ): ResponseEntity<Map<String, Any>> {
        val result = bibleTextService.getRange(translation, book, chapter, verseStart, verseEnd)
        return ResponseEntity.ok(result)
    }

    /**
     * 获取随机经文
     */
    @GetMapping("/{translation}/random")
    fun randomVerse(@PathVariable translation: String): ResponseEntity<Map<String, Any>> {
        val result = bibleTextService.getRandomVerse(translation)
        return ResponseEntity.ok(result)
    }

    /**
     * 获取所有译本列表
     */
    @GetMapping("/translations")
    fun listTranslations(): ResponseEntity<Map<String, Any>> {
        val translations = bibleTextService.listTranslations()
        return ResponseEntity.ok(mapOf("translations" to translations))
    }

    /**
     * 获取某译本的所有书卷
     */
    @GetMapping("/{translation}/books")
    fun listBooks(@PathVariable translation: String): ResponseEntity<Map<String, Any>> {
        val books = bibleTextService.listBooks(translation)
        return ResponseEntity.ok(mapOf("books" to books))
    }

    // ==================== 内部接口（供 module-service 调用） ====================

    /**
     * 导入圣经数据
     *
     * 内部接口，供 module-service 解析完 XML 后调用
     */
    @PostMapping("/import")
    fun importBibleData(@RequestBody request: ImportRequest): ResponseEntity<Map<String, Any>> {
        val result = bibleTextService.importBibleData(
            translationCode = request.translationCode,
            translationName = request.translationName,
            language = request.language,
            books = request.books,
            verses = request.verses
        )
        return ResponseEntity.ok(result)
    }

    /**
     * 删除译本数据
     */
    @DeleteMapping("/import/{translation}")
    fun deleteTranslation(@PathVariable translation: String): ResponseEntity<Map<String, Any>> {
        val result = bibleTextService.deleteTranslation(translation)
        return ResponseEntity.ok(result)
    }

    // ==================== Interlinear (逐词对照) API ====================

    /**
     * 获取整章的逐词对照数据
     */
    @GetMapping("/interlinear/{translation}/{book}/{chapter}")
    fun getInterlinear(
        @PathVariable translation: String,
        @PathVariable book: String,
        @PathVariable chapter: Int
    ): ResponseEntity<Map<String, Any>> {
        val result = bibleTextService.getInterlinear(translation, book, chapter)
        return ResponseEntity.ok(result)
    }

    /**
     * 获取单节的逐词对照数据
     */
    @GetMapping("/interlinear/{translation}/{book}/{chapter}/{verse}")
    fun getInterlinearVerse(
        @PathVariable translation: String,
        @PathVariable book: String,
        @PathVariable chapter: Int,
        @PathVariable verse: Int
    ): ResponseEntity<Map<String, Any>> {
        val result = bibleTextService.getInterlinearVerse(translation, book, chapter, verse)
        return ResponseEntity.ok(result)
    }
}

/**
 * 导入请求数据结构
 */
data class ImportRequest(
    val translationCode: String,
    val translationName: String,
    val language: String,
    val books: List<Map<String, Any>>,
    val verses: List<Map<String, Any>>
)