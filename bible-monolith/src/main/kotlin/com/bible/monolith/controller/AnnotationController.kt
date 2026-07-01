package com.bible.monolith.controller

import com.bible.monolith.service.AnnotationService
import com.bible.monolith.service.BibleTextService
import com.bible.monolith.service.SwordCommentaryService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.net.URLDecoder
import java.nio.charset.StandardCharsets

/**
 * 注释/笔记/书签 API
 *
 * - GET  /api/v1/annotations/commentaries/{book}/{chapter}?verse=X&source=xxx
 * - GET  /api/v1/annotations/notes/{verseRef}
 * - POST /api/v1/annotations/notes
 * - PUT  /api/v1/annotations/notes/{id}
 * - DEL  /api/v1/annotations/notes/{id}
 * - GET  /api/v1/annotations/bookmarks/{verseRef}
 * - POST /api/v1/annotations/bookmarks
 * - DEL /api/v1/annotations/bookmarks/{id}
 * - GET  /api/v1/bible/{translation}/{book}/{chapter}/{verse}/crossrefs
 * - POST /api/v1/annotations/import-commentary
 */
@RestController
@RequestMapping("/api/v1/annotations")
class AnnotationController(
    private val annotationService: AnnotationService,
    private val bibleTextService: BibleTextService,
    private val swordCommentaryService: SwordCommentaryService
) {

    // ==================== 注释书 ====================

    @GetMapping("/commentaries/{book}/{chapter}")
    fun getCommentaries(
        @PathVariable book: String,
        @PathVariable chapter: Int,
        @RequestParam(required = false) verse: Int?,
        @RequestParam(required = false) source: String?
    ): ResponseEntity<Map<String, Any>> {
        // ── 1. H2 COMMENTARIES table (imported data) ──
        val h2Sources = annotationService.getAllCommentarySources()
        val h2Ids = h2Sources.map { it.first }.toSet()
        val h2Result = if (source == null || source in h2Ids) {
            annotationService.getCommentaries(source, book, chapter, verse)
        } else emptyList()

        // ── 2. SWORD COMMENTARY modules (JSword direct read) ──
        val swordSources = swordCommentaryService.listSources(excludeIds = h2Ids)
        val swordIds = swordSources.map { it.id }.toSet()
        val swordResult: List<SwordCommentaryService.CommentaryEntry> = if (source == null || source in swordIds) {
            if (verse != null) {
                val entry = swordCommentaryService.getCommentaryForVerse(source ?: "", book, chapter, verse)
                if (entry != null) listOf(entry) else emptyList()
            } else {
                if (source != null) {
                    swordCommentaryService.getCommentaryForChapter(source, book, chapter)
                } else {
                    swordSources.flatMap { src: SwordCommentaryService.SwordCommentarySource ->
                        swordCommentaryService.getCommentaryForChapter(src.id, book, chapter)
                    }
                }
            }
        } else emptyList()

        // ── 3. Merge results ──
        val allCommentaries = mutableListOf<Map<String, Any?>>()
        // H2 entries
        allCommentaries.addAll(h2Result.map { c ->
            mapOf(
                "source" to c.source,
                "sourceName" to c.sourceName,
                "bookId" to c.bookId,
                "chapter" to c.chapter,
                "verseStart" to c.verseStart,
                "verseEnd" to c.verseEnd,
                "text" to c.text,
                "storage" to "h2"
            )
        })
        // SWORD entries
        allCommentaries.addAll(swordResult.map { e ->
            mapOf(
                "source" to e.source,
                "sourceName" to e.sourceName,
                "bookId" to e.bookId,
                "chapter" to e.chapter,
                "verseStart" to e.verseStart,
                "verseEnd" to e.verseEnd,
                "text" to e.text,
                "storage" to "sword"
            )
        })

        // ── 4. Merge source lists ──
        val allSources = mutableListOf<Map<String, String>>()
        allSources.addAll(h2Sources.map { (s: String, n: String) -> mapOf("id" to s, "name" to n, "storage" to "h2") })
        allSources.addAll(swordSources.map { s: SwordCommentaryService.SwordCommentarySource -> mapOf("id" to s.id, "name" to s.name, "storage" to "sword") })

        return ResponseEntity.ok(mapOf(
            "commentaries" to allCommentaries,
            "sources" to allSources
        ))
    }

    @GetMapping("/commentary-sources")
    fun getSources(): ResponseEntity<Map<String, Any>> {
        val h2Sources = annotationService.getAllCommentarySources()
        val h2Ids = h2Sources.map { it.first }.toSet()
        val swordSources = swordCommentaryService.listSources(excludeIds = h2Ids)

        val allSources = mutableListOf<Map<String, String>>()
        allSources.addAll(h2Sources.map { (s: String, n: String) -> mapOf("id" to s, "name" to n, "storage" to "h2") })
        allSources.addAll(swordSources.map { s: SwordCommentaryService.SwordCommentarySource -> mapOf("id" to s.id, "name" to s.name, "storage" to "sword") })

        return ResponseEntity.ok(mapOf(
            "sources" to allSources
        ))
    }

    /**
     * 导入注释书数据（内部接口）
     */
    @PostMapping("/import-commentary")
    fun importCommentary(@RequestBody request: ImportCommentaryRequest): ResponseEntity<Map<String, Any>> {
        val result = annotationService.importCommentaries(
            source = request.source,
            sourceName = request.sourceName,
            commentaries = request.commentaries
        )
        return ResponseEntity.ok(result)
    }

    // ==================== 字典 ====================

    @GetMapping("/dictionary-sources")
    fun getDictionarySources(): ResponseEntity<Map<String, Any>> {
        val sources = annotationService.getDictionarySources()
        return ResponseEntity.ok(mapOf(
            "sources" to sources.map { (s, n) -> mapOf("id" to s, "name" to n) }
        ))
    }

    @GetMapping("/dictionaries/{source}")
    fun getDictionaryEntries(
        @PathVariable source: String,
        @RequestParam(required = false) search: String?,
        @RequestParam(required = false) entryId: String?
    ): ResponseEntity<Map<String, Any>> {
        val result = when {
            entryId != null -> {
                val entry = annotationService.getDictionaryEntry(source, entryId)
                if (entry != null) listOf(entry) else emptyList()
            }
            search != null -> annotationService.searchDictionary(source, search)
            else -> annotationService.getDictionaryEntries(source)
        }

        val sources = annotationService.getDictionarySources()
        return ResponseEntity.ok(mapOf(
            "entries" to result.map { e ->
                mapOf(
                    "id" to (e.id ?: 0L),
                    "source" to e.source,
                    "sourceName" to e.sourceName,
                    "entryId" to e.entryId,
                    "definition" to e.definition
                )
            },
            "sources" to sources.map { (s, n) -> mapOf("id" to s, "name" to n) }
        ))
    }

    @PostMapping("/import-dictionary")
    fun importDictionary(@RequestBody request: ImportDictionaryRequest): ResponseEntity<Map<String, Any>> {
        val result = annotationService.importDictionaryEntries(
            source = request.source,
            sourceName = request.sourceName,
            entries = request.entries
        )
        return ResponseEntity.ok(result)
    }

    // ==================== 笔记 ====================

    @GetMapping("/notes/{verseRef}")
    fun getNotes(@PathVariable verseRef: String): ResponseEntity<Map<String, Any>> {
        val decoded = URLDecoder.decode(verseRef, StandardCharsets.UTF_8)
        val notes = annotationService.getNotesByVerse("system", decoded)
        return ResponseEntity.ok(mapOf(
            "notes" to notes.map { n ->
                mapOf(
                    "id" to n.id,
                    "verseRef" to n.verseRef,
                    "title" to n.title,
                    "content" to n.content,
                    "createdAt" to n.createdAt.toString(),
                    "updatedAt" to n.updatedAt.toString()
                )
            }
        ))
    }

    @PostMapping("/notes")
    fun createNote(@RequestBody request: CreateNoteRequest): ResponseEntity<Map<String, Any>> {
        val note = annotationService.createNote(
            userId = "system",
            verseRef = request.verseRef,
            content = request.content,
            title = request.title
        )
        return ResponseEntity.ok(mapOf(
            "status" to "ok",
            "id" to (note.id ?: 0L),
            "verseRef" to note.verseRef
        ))
    }

    @DeleteMapping("/notes/{id}")
    fun deleteNote(@PathVariable id: Long): ResponseEntity<Map<String, Any>> {
        annotationService.deleteNote("system", id)
        return ResponseEntity.ok(mapOf("status" to "ok"))
    }

    // ==================== 书签/高亮 ====================

    @GetMapping("/bookmarks/{verseRef}")
    fun getBookmarks(@PathVariable verseRef: String): ResponseEntity<Map<String, Any>> {
        val decoded = URLDecoder.decode(verseRef, StandardCharsets.UTF_8)
        val bms = annotationService.getBookmarksByVerse("system", decoded)
        return ResponseEntity.ok(mapOf(
            "bookmarks" to bms.map { b ->
                mapOf<String, Any>(
                    "id" to (b.id ?: 0L),
                    "verseRef" to b.verseRef,
                    "color" to (b.color ?: ""),
                    "note" to (b.note ?: ""),
                    "createdAt" to b.createdAt.toString()
                )
            }
        ))
    }

    @PostMapping("/bookmarks")
    fun createBookmark(@RequestBody request: CreateBookmarkRequest): ResponseEntity<Map<String, Any>> {
        val bm = annotationService.createBookmark(
            userId = "system",
            verseRef = request.verseRef,
            color = request.color ?: "yellow",
            note = request.note ?: ""
        )
        return ResponseEntity.ok(mapOf(
            "status" to "ok",
            "id" to (bm.id ?: 0L),
            "verseRef" to bm.verseRef
        ))
    }

    @DeleteMapping("/bookmarks/{verseRef}")
    fun deleteBookmark(@PathVariable verseRef: String): ResponseEntity<Map<String, Any>> {
        val decoded = URLDecoder.decode(verseRef, StandardCharsets.UTF_8)
        annotationService.deleteBookmarkByVerse("system", decoded)
        return ResponseEntity.ok(mapOf("status" to "ok"))
    }

    // ==================== 交叉引用 ====================

    /**
     * 获取经文的交叉引用
     * 内嵌 TSK（Treasure of Scripture Knowledge）数据
     */
    @GetMapping("/crossrefs")
    fun getCrossReferences(
        @RequestParam translation: String,
        @RequestParam book: String,
        @RequestParam chapter: Int,
        @RequestParam verse: Int
    ): ResponseEntity<Map<String, Any>> {
        val refs = CrossRefService.getCrossRefs(book, chapter, verse)
        return ResponseEntity.ok(mapOf(
            "verseRef" to "$translation:$book:$chapter:$verse",
            "crossReferences" to refs
        ))
    }
}

// ==================== 请求 DTO ====================

data class ImportCommentaryRequest(
    val source: String,
    val sourceName: String,
    val commentaries: List<Map<String, Any>>
)

data class CreateNoteRequest(
    val verseRef: String,
    val title: String?,
    val content: String
)

data class UpdateNoteRequest(
    val content: String?,
    val title: String?
)

data class CreateBookmarkRequest(
    val verseRef: String,
    val color: String?,
    val note: String?
)

data class ImportDictionaryRequest(
    val source: String,
    val sourceName: String,
    val entries: List<Map<String, Any>>
)