package com.bible.text.service

import com.bible.text.entity.Bookmark
import com.bible.text.entity.Commentary
import com.bible.text.entity.DictionaryEntry
import com.bible.text.entity.Note
import com.bible.text.repository.BookmarkRepository
import com.bible.text.repository.CommentaryRepository
import com.bible.text.repository.DictionaryRepository
import com.bible.text.repository.NoteRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

@Service
class AnnotationService(
    private val noteRepository: NoteRepository,
    private val bookmarkRepository: BookmarkRepository,
    private val commentaryRepository: CommentaryRepository,
    private val dictionaryRepository: DictionaryRepository
) {

    // ==================== 笔记 ====================

    fun getNotesByVerse(verseRef: String): List<Note> =
        noteRepository.findByVerseRefOrderByUpdatedAtDesc(verseRef)

    fun getAllNotes(): List<Note> =
        noteRepository.findAllByOrderByUpdatedAtDesc()

    @Transactional
    fun createNote(verseRef: String, content: String, title: String?): Note {
        val note = Note(
            verseRef = verseRef,
            title = title,
            content = content
        )
        return noteRepository.save(note)
    }

    @Transactional
    fun updateNote(id: Long, content: String, title: String?): Note? {
        val note = noteRepository.findById(id).orElse(null) ?: return null
        val updated = note.copy(
            content = content,
            title = title ?: note.title,
            updatedAt = Instant.now()
        )
        return noteRepository.save(updated)
    }

    @Transactional
    fun deleteNote(id: Long): Boolean {
        return if (noteRepository.existsById(id)) {
            noteRepository.deleteById(id)
            true
        } else false
    }

    // ==================== 书签/高亮 ====================

    fun getBookmarksByVerse(verseRef: String): List<Bookmark> =
        bookmarkRepository.findByVerseRef(verseRef)

    fun getAllBookmarks(): List<Bookmark> =
        bookmarkRepository.findAllByOrderByCreatedAtDesc()

    fun getBookmarksForVerses(verseRefs: List<String>): List<Bookmark> =
        bookmarkRepository.findDistinctByVerseRefIn(verseRefs)

    @Transactional
    fun createBookmark(verseRef: String, color: String?, note: String?): Bookmark {
        // 同一经文同颜色不重复创建
        val existing = bookmarkRepository.findByVerseRef(verseRef)
            .firstOrNull { it.color == color }
        if (existing != null) return existing

        return bookmarkRepository.save(Bookmark(
            verseRef = verseRef,
            color = color,
            note = note
        ))
    }

    @Transactional
    fun deleteBookmark(id: Long): Boolean {
        return if (bookmarkRepository.existsById(id)) {
            bookmarkRepository.deleteById(id)
            true
        } else false
    }

    @Transactional
    fun deleteBookmarkByVerse(verseRef: String) {
        bookmarkRepository.deleteByVerseRef(verseRef)
    }

    // ==================== 字典 ====================

    fun getDictionarySources(): List<Pair<String, String>> {
        return dictionaryRepository.findDistinctSources().map { row ->
            Pair(row[0] as String, row[1] as String)
        }
    }

    fun getDictionaryEntries(source: String): List<DictionaryEntry> {
        return dictionaryRepository.findBySourceOrderByEntryId(source)
    }

    fun getDictionaryEntry(source: String, entryId: String): DictionaryEntry? {
        return dictionaryRepository.findBySourceAndEntryId(source, entryId)
    }

    fun searchDictionary(source: String, query: String): List<DictionaryEntry> {
        val entries = dictionaryRepository.searchBySourceAndEntryId(source, query)
        return if (entries.isNotEmpty()) entries
        else dictionaryRepository.searchBySourceAndText(source, query)
    }

    /**
     * 批量导入字典词条
     */
    @Transactional
    fun importDictionaryEntries(
        source: String,
        sourceName: String,
        entries: List<Map<String, Any>>
    ): Map<String, Any> {
        var imported = 0
        var skipped = 0

        for (e in entries) {
            val entryId = e["entryId"] as? String ?: continue
            val definition = e["definition"] as? String ?: continue

            if (dictionaryRepository.existsBySourceAndEntryId(source, entryId)) {
                skipped++
                continue
            }

            dictionaryRepository.save(DictionaryEntry(
                source = source,
                sourceName = sourceName,
                entryId = entryId,
                definition = definition
            ))
            imported++
        }

        return mapOf(
            "status" to "ok",
            "imported" to imported,
            "skipped" to skipped,
            "total" to (imported + skipped)
        )
    }

    // ==================== 注释 ====================

    fun getCommentaries(source: String?, bookId: String, chapter: Int, verse: Int?): List<Commentary> {
        val upperBookId = bookId.uppercase()
        return if (source != null) {
            if (verse != null) {
                commentaryRepository.findBySourceAndBookIdAndChapterAndVerseStartLessThanEqualAndVerseEndGreaterThanEqual(
                    source, upperBookId, chapter, verse, verse
                )
            } else {
                commentaryRepository.findBySourceAndBookIdAndChapter(source, upperBookId, chapter)
            }
        } else {
            // 返回所有源
            getAllCommentarySources().flatMap { (src, _) ->
                if (verse != null) {
                    commentaryRepository.findBySourceAndBookIdAndChapterAndVerseStartLessThanEqualAndVerseEndGreaterThanEqual(
                        src, upperBookId, chapter, verse, verse
                    )
                } else {
                    commentaryRepository.findBySourceAndBookIdAndChapter(src, upperBookId, chapter)
                }
            }
        }
    }

    // Dictionary sources stored in COMMENTARIES table should NOT appear as commentary sources
    private val dictionarySourceIds = setOf("Easton", "ISBE", "Nave")

    fun getAllCommentarySources(): List<Pair<String, String>> {
        return commentaryRepository.findDistinctSources().map { row ->
            Pair(row[0] as String, row[1] as String)
        }.filter { (id, _) -> id !in dictionarySourceIds }
    }

    /**
     * 批量导入注释数据
     */
    @Transactional
    fun importCommentaries(
        source: String,
        sourceName: String,
        commentaries: List<Map<String, Any>>
    ): Map<String, Any> {
        var imported = 0
        var skipped = 0

        for (c in commentaries) {
            val bookId = (c["bookId"] as? String ?: continue).uppercase()
            val chapter = (c["chapter"] as? Number)?.toInt() ?: continue
            val verseStart = (c["verseStart"] as? Number)?.toInt() ?: 0
            val verseEnd = (c["verseEnd"] as? Number)?.toInt() ?: verseStart
            val text = c["text"] as? String ?: continue

            // 检查是否已存在
            if (commentaryRepository.existsBySourceAndBookIdAndChapterAndVerseStart(
                    source, bookId, chapter, verseStart
                )) {
                skipped++
                continue
            }

            commentaryRepository.save(Commentary(
                source = source,
                sourceName = sourceName,
                bookId = bookId,
                chapter = chapter,
                verseStart = verseStart,
                verseEnd = verseEnd,
                text = text
            ))
            imported++
        }

        return mapOf(
            "status" to "ok",
            "imported" to imported,
            "skipped" to skipped,
            "total" to (imported + skipped)
        )
    }
}