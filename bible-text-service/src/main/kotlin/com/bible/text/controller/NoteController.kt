package com.bible.text.controller

import com.bible.text.entity.Note
import com.bible.text.repository.NoteRepository
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.time.Instant

/**
 * 笔记管理 API
 *
 * GET    /api/v1/text/notes              — 列出所有笔记
 * GET    /api/v1/text/notes/{verseRef}   — 查某经节笔记
 * POST   /api/v1/text/notes              — 创建/更新笔记
 * PUT    /api/v1/text/notes/{verseRef}   — 更新笔记
 * DELETE /api/v1/text/notes/{verseRef}   — 删除笔记
 */
@RestController
@RequestMapping("/api/v1/text/notes")
class NoteController(
    private val noteRepo: NoteRepository
) {

    @GetMapping
    fun listAll(): ResponseEntity<List<Note>> =
        ResponseEntity.ok(noteRepo.findAllByOrderByUpdatedAtDesc())

    @GetMapping("/{verseRef}")
    fun getByRef(@PathVariable verseRef: String): ResponseEntity<List<Note>> =
        ResponseEntity.ok(noteRepo.findByVerseRefOrderByUpdatedAtDesc(verseRef))

    @PostMapping
    fun createOrUpdate(@RequestBody body: Map<String, Any?>): ResponseEntity<Note> {
        val verseRef = body["verseRef"] as? String ?: body["ref"] as? String ?: ""
        val content = body["content"] as? String ?: ""
        val title = body["title"] as? String

        // Upsert: delete existing then create new (simpler than find+update)
        noteRepo.deleteByVerseRef(verseRef)
        val note = Note(
            verseRef = verseRef,
            title = title,
            content = content,
            updatedAt = Instant.now()
        )
        return ResponseEntity.ok(noteRepo.save(note))
    }

    @PutMapping("/{verseRef}")
    fun update(@PathVariable verseRef: String, @RequestBody body: Map<String, Any?>): ResponseEntity<Note> {
        val existing = noteRepo.findByVerseRefOrderByUpdatedAtDesc(verseRef)
        val note = if (existing.isNotEmpty()) existing.first() else Note(verseRef = verseRef, content = "")

        val updated = note.copy(
            title = body["title"] as? String ?: note.title,
            content = body["content"] as? String ?: note.content,
            updatedAt = Instant.now()
        )
        return ResponseEntity.ok(noteRepo.save(updated))
    }

    @DeleteMapping("/{verseRef}")
    fun delete(@PathVariable verseRef: String): ResponseEntity<Map<String, Any>> {
        noteRepo.deleteByVerseRef(verseRef)
        return ResponseEntity.ok(mapOf("deleted" to true, "verseRef" to verseRef))
    }
}
