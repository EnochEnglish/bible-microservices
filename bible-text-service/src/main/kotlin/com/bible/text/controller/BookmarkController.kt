package com.bible.text.controller

import com.bible.text.entity.Bookmark
import com.bible.text.repository.BookmarkRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

/**
 * 书签管理 API
 *
 * GET    /api/v1/text/bookmarks              — 列出所有书签
 * GET    /api/v1/text/bookmarks/{verseRef}   — 查某经节书签
 * POST   /api/v1/text/bookmarks              — 添加书签
 * DELETE /api/v1/text/bookmarks/{verseRef}   — 删除书签（按 verseRef）
 * DELETE /api/v1/text/bookmarks/id/{id}      — 删除书签（按 id）
 */
@RestController
@RequestMapping("/api/v1/text/bookmarks")
class BookmarkController(
    private val bookmarkRepo: BookmarkRepository
) {

    @GetMapping
    fun listAll(): ResponseEntity<List<Bookmark>> =
        ResponseEntity.ok(bookmarkRepo.findAllByOrderByCreatedAtDesc())

    @GetMapping("/{verseRef}")
    fun getByRef(@PathVariable verseRef: String): ResponseEntity<List<Bookmark>> =
        ResponseEntity.ok(bookmarkRepo.findByVerseRef(verseRef))

    @PostMapping
    fun create(@RequestBody body: Map<String, Any?>): ResponseEntity<Bookmark> {
        val verseRef = body["verseRef"] as? String ?: body["ref"] as? String ?: ""
        val label = body["label"] as? String
        val color = body["color"] as? String
        val note = body["note"] as? String ?: label
        val bookmark = Bookmark(verseRef = verseRef, color = color, note = note)
        return ResponseEntity.ok(bookmarkRepo.save(bookmark))
    }

    @DeleteMapping("/{verseRef}")
    fun deleteByRef(@PathVariable verseRef: String): ResponseEntity<Map<String, Any>> {
        bookmarkRepo.deleteByVerseRef(verseRef)
        return ResponseEntity.ok(mapOf("deleted" to true, "verseRef" to verseRef))
    }

    @DeleteMapping("/id/{id}")
    fun deleteById(@PathVariable id: Long): ResponseEntity<Map<String, Any>> {
        bookmarkRepo.deleteById(id)
        return ResponseEntity.ok(mapOf("deleted" to true, "id" to id))
    }
}
