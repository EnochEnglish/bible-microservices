package com.bible.monolith.service

import org.crosswire.jsword.book.Book
import org.crosswire.jsword.book.BookCategory
import org.crosswire.jsword.book.BookData
import org.crosswire.jsword.book.Books
import org.crosswire.jsword.passage.Key
import org.jdom2.output.Format
import org.jdom2.output.XMLOutputter
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

/**
 * Direct JSword reader for SWORD COMMENTARY modules.
 *
 * COMMENTARY modules in SWORD are verse-keyed — each key is a Bible reference
 * (e.g. Gen.1.1) and the content is the commentary for that verse/passage.
 * This service reads them via BookData(book, key) → OSIS XML.
 *
 * Design: works alongside H2-based AnnotationService.
 * New modules downloaded from CrossWire are instant-available via JSword
 * without needing import scripts; H2 import pathway remains for custom/
 * user-uploaded commentaries.
 */
@Service
class SwordCommentaryService {

    private val log = LoggerFactory.getLogger(SwordCommentaryService::class.java)

    data class SwordCommentarySource(
        val id: String,
        val name: String
    )

    data class CommentaryEntry(
        val source: String,
        val sourceName: String,
        val bookId: String,
        val chapter: Int,
        val verseStart: Int,
        val verseEnd: Int,
        val text: String
    )

    /**
     * Get all COMMENTARY modules available via JSword.
     * Excludes those already in H2 COMMENTARIES table (served by AnnotationService).
     */
    fun listSources(excludeIds: Set<String> = emptySet()): List<SwordCommentarySource> {
        return Books.installed().books
            .filter { it.bookCategory == BookCategory.COMMENTARY }
            .filter { it.initials !in excludeIds }
            .map { SwordCommentarySource(id = it.initials, name = it.name) }
            .sortedBy { it.id }
    }

    /**
     * Read commentary for a Bible reference from a SWORD module.
     *
     * @param module JSword module initials (e.g. "TDavid")
     * @param osisRef Bible reference in OSIS format (e.g. "Gen.1.1")
     * @return commentary text as plain string, or null if not found
     */
    fun getCommentaryText(module: String, osisRef: String): String? {
        val book = findBook(module) ?: return null
        if (book.bookCategory != BookCategory.COMMENTARY) return null

        val key = try {
            book.getKey(osisRef)
        } catch (_: Exception) { return null }

        if (key == null) return null
        if (!bookContains(book, key)) return null

        return try {
            val data = BookData(book, key)
            val fragment = data.osisFragment
            val outputter = XMLOutputter(Format.getRawFormat())
            val xml = outputter.outputString(fragment)
            extractPlainText(xml)
        } catch (e: Exception) {
            log.error("Failed to read commentary: module={} ref={}", module, osisRef, e)
            null
        }
    }

    /**
     * Get commentaries for a chapter from a SWORD module.
     * Iterates over each verse in the chapter and collects non-null results.
     */
    fun getCommentaryForChapter(module: String, bookId: String, chapter: Int): List<CommentaryEntry> {
        val book = findBook(module) ?: return emptyList()
        if (book.bookCategory != BookCategory.COMMENTARY) return emptyList()

        val sourceName = book.name
        val entries = mutableListOf<CommentaryEntry>()

        // Try up to 176 verses (Ps 119) — stop when 3 consecutive misses
        var misses = 0
        for (verse in 1..176) {
            val ref = "$bookId.$chapter.$verse"
            val text = getCommentaryText(module, ref)
            if (text != null) {
                entries.add(CommentaryEntry(
                    source = module,
                    sourceName = sourceName,
                    bookId = bookId,
                    chapter = chapter,
                    verseStart = verse,
                    verseEnd = verse,
                    text = text
                ))
                misses = 0
            } else {
                misses++
                if (misses >= 3 && verse > 10) break // end of chapter
            }
        }
        return entries
    }

    /**
     * Get commentaries for a specific verse.
     */
    fun getCommentaryForVerse(module: String, bookId: String, chapter: Int, verse: Int): CommentaryEntry? {
        val ref = "$bookId.$chapter.$verse"
        val text = getCommentaryText(module, ref) ?: return null

        return CommentaryEntry(
            source = module,
            sourceName = findBook(module)?.name ?: module,
            bookId = bookId,
            chapter = chapter,
            verseStart = verse,
            verseEnd = verse,
            text = text
        )
    }

    // ─── Helpers ───

    private fun findBook(module: String): Book? {
        return Books.installed().books.find {
            it.initials == module || it.initials.equals(module, ignoreCase = true)
        }
    }

    private fun bookContains(book: Book, key: Key): Boolean {
        return try { book.contains(key); true } catch (_: Exception) { false }
    }

    /**
     * Extract plain text from OSIS XML, removing all tags.
     */
    private fun extractPlainText(xml: String): String {
        val sb = StringBuilder()
        var inTag = false
        for (ch in xml) {
            when {
                ch == '<' -> inTag = true
                ch == '>' -> inTag = false
                !inTag -> sb.append(ch)
            }
        }
        return sb.toString()
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&apos;", "'")
            .trim()
    }
}
