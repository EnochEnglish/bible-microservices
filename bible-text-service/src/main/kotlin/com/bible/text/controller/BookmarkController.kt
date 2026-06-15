package com.bible.text.controller

import com.bible.text.entity.Bookmark
import com.bible.text.repository.BookmarkRepository
import com.bible.text.util.JwtUtil
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

/**
 * 书签管理 API — 用户绑定（需认证）
 *
 * GET    /api/v1/text/bookmarks              — 列出当前用户所有书签
 * GET    /api/v1/text/bookmarks/{verseRef}   — 查某经节的书签
 * POST   /api/v1/text/bookmarks              — 添加书签
 * DELETE /api/v1/text/bookmarks/{verseRef}   — 删除书签
 */
@RestController
@RequestMapping("/api/v1/text/bookmarks")
class BookmarkController(
    private val bookmarkRepo: BookmarkRepository
) {

    /** Extract userId from Authorization header */
    private fun requireUserId(request: HttpServletRequest): String? {
        val auth = request.getHeader("Authorization")
        return JwtUtil.userIdFromAuthHeader(auth)
    }

    @GetMapping
    fun listByUser(request: HttpServletRequest): ResponseEntity<*> {
        val userId = requireUserId(request) ?: return ResponseEntity.status(401).body(mapOf("error" to "Unauthorized"))
        return ResponseEntity.ok(bookmarkRepo.findByUserIdOrderByCreatedAtDesc(userId))
    }

    @GetMapping("/{verseRef}")
    fun getByRef(@PathVariable verseRef: String, request: HttpServletRequest): ResponseEntity<*> {
        val userId = requireUserId(request) ?: return ResponseEntity.status(401).body(mapOf("error" to "Unauthorized"))
        return ResponseEntity.ok(bookmarkRepo.findByUserIdAndVerseRef(userId, verseRef))
    }

    @PostMapping
    fun create(@RequestBody body: Map<String, Any?>, request: HttpServletRequest): ResponseEntity<*> {
        val userId = requireUserId(request) ?: return ResponseEntity.status(401).body(mapOf("error" to "Unauthorized"))
        val verseRef = body["verseRef"] as? String ?: body["ref"] as? String ?: ""
        val color = body["color"] as? String
        val note = body["note"] as? String
        val bookmark = Bookmark(userId = userId, verseRef = verseRef, color = color, note = note)
        return ResponseEntity.ok(bookmarkRepo.save(bookmark))
    }

    @DeleteMapping("/{verseRef}")
    fun deleteByRef(@PathVariable verseRef: String, request: HttpServletRequest): ResponseEntity<*> {
        val userId = requireUserId(request) ?: return ResponseEntity.status(401).body(mapOf("error" to "Unauthorized"))
        bookmarkRepo.deleteByUserIdAndVerseRef(userId, verseRef)
        return ResponseEntity.ok(mapOf("deleted" to true, "verseRef" to verseRef))
    }
}
