package com.bible.text.controller

import com.bible.text.entity.Note
import com.bible.text.repository.NoteRepository
import com.bible.text.util.JwtUtil
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.Instant

/**
 * 笔记管理 API — 用户绑定（需认证）
 *
 * GET    /api/v1/text/notes              — 列出当前用户所有笔记
 * GET    /api/v1/text/notes/{verseRef}   — 查某经节的笔记
 * POST   /api/v1/text/notes              — 创建/更新笔记
 * DELETE /api/v1/text/notes/{verseRef}   — 删除笔记
 */
@RestController
@RequestMapping("/api/v1/text/notes")
class NoteController(
    private val noteRepo: NoteRepository
) {

    private fun requireUserId(request: HttpServletRequest): String? {
        val auth = request.getHeader("Authorization")
        return JwtUtil.userIdFromAuthHeader(auth)
    }

    @GetMapping
    fun listByUser(request: HttpServletRequest): ResponseEntity<*> {
        val userId = requireUserId(request) ?: return ResponseEntity.status(401).body(mapOf("error" to "Unauthorized"))
        return ResponseEntity.ok(noteRepo.findByUserIdOrderByUpdatedAtDesc(userId))
    }

    @GetMapping("/{verseRef}")
    fun getByRef(@PathVariable verseRef: String, request: HttpServletRequest): ResponseEntity<*> {
        val userId = requireUserId(request) ?: return ResponseEntity.status(401).body(mapOf("error" to "Unauthorized"))
        return ResponseEntity.ok(noteRepo.findByUserIdAndVerseRefOrderByUpdatedAtDesc(userId, verseRef))
    }

    @PostMapping
    fun createOrUpdate(@RequestBody body: Map<String, Any?>, request: HttpServletRequest): ResponseEntity<*> {
        val userId = requireUserId(request) ?: return ResponseEntity.status(401).body(mapOf("error" to "Unauthorized"))
        val verseRef = body["verseRef"] as? String ?: body["ref"] as? String ?: ""
        val content = body["content"] as? String ?: ""
        val title = body["title"] as? String

        // Upsert: delete existing then create new
        noteRepo.deleteByUserIdAndVerseRef(userId, verseRef)
        val note = Note(
            userId = userId,
            verseRef = verseRef,
            title = title,
            content = content,
            updatedAt = Instant.now()
        )
        return ResponseEntity.ok(noteRepo.save(note))
    }

    @DeleteMapping("/{verseRef}")
    fun delete(@PathVariable verseRef: String, request: HttpServletRequest): ResponseEntity<*> {
        val userId = requireUserId(request) ?: return ResponseEntity.status(401).body(mapOf("error" to "Unauthorized"))
        noteRepo.deleteByUserIdAndVerseRef(userId, verseRef)
        return ResponseEntity.ok(mapOf("deleted" to true, "verseRef" to verseRef))
    }
}
