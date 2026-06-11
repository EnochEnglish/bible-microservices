package com.bible.sword.service

import com.bible.sword.dto.GenBookContentResponse
import com.bible.sword.dto.GenBookKeyInfo
import com.bible.sword.dto.GenBookKeysResponse
import org.crosswire.jsword.book.Book
import org.crosswire.jsword.book.BookCategory
import org.crosswire.jsword.book.BookData
import org.crosswire.jsword.book.Books
import org.jdom2.output.Format
import org.jdom2.output.XMLOutputter
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class GenBookService {

    private val log = LoggerFactory.getLogger(GenBookService::class.java)

    /**
     * List table-of-contents keys for a GenBook module.
     * DAILY_DEVOTION modules are treated as GENERAL_BOOK by JSword.
     */
    fun listKeys(module: String, offset: Int, limit: Int): GenBookKeysResponse? {
        val book = findBook(module) ?: return null
        val category = book.bookCategory
        if (category != BookCategory.GENERAL_BOOK && category != BookCategory.DAILY_DEVOTIONS) return null

        val allKeys = mutableListOf<org.crosswire.jsword.passage.Key>()
        for (key in book.globalKeyList) {
            if (key.name.isNotBlank()) {
                allKeys.add(key)
            }
        }

        val clamped = limit.coerceIn(1, 500)
        val clampedOffset = offset.coerceIn(0, allKeys.size)
        val page = allKeys.drop(clampedOffset).take(clamped)

        return GenBookKeysResponse(
            module = module,
            moduleName = book.name,
            totalCount = allKeys.size,
            offset = clampedOffset,
            returnedCount = page.size,
            hasMore = clampedOffset + page.size < allKeys.size,
            keys = page.map { GenBookKeyInfo(name = it.name, osisRef = it.osisRef ?: it.name) }
        )
    }

    /**
     * Read content of a specific key in a GenBook module.
     * Returns OSIS XML as JDOM string, or null if not found.
     */
    fun getContent(module: String, keyRef: String): GenBookContentResponse? {
        val book = findBook(module) ?: return null
        val category = book.bookCategory
        if (category != BookCategory.GENERAL_BOOK && category != BookCategory.DAILY_DEVOTIONS) return null

        val key = book.getKey(keyRef)
            ?: return GenBookContentResponse(
                module = module,
                moduleName = book.name,
                key = keyRef,
                keyName = keyRef,
                content = null,
                found = false,
                message = "Key not found: $keyRef"
            )

        if (!bookContains(book, key)) {
            return GenBookContentResponse(
                module = module,
                moduleName = book.name,
                key = keyRef,
                keyName = key.name,
                content = null,
                found = false,
                message = "Key '$keyRef' not in document ${book.initials}"
            )
        }

        return try {
            val data = BookData(book, key)
            val fragment = data.osisFragment
            val outputter = XMLOutputter(Format.getRawFormat())
            val xml = outputter.outputString(fragment)

            GenBookContentResponse(
                module = module,
                moduleName = book.name,
                key = keyRef,
                keyName = key.name,
                content = xml,
                found = true
            )
        } catch (e: Exception) {
            log.error("Failed to read GenBook content: module={} key={}", module, keyRef, e)
            GenBookContentResponse(
                module = module,
                moduleName = book.name,
                key = keyRef,
                keyName = key.name,
                content = null,
                found = false,
                message = "Read error: ${e.message}"
            )
        }
    }

    private fun findBook(module: String): Book? {
        return Books.installed().books.find {
            it.initials == module || it.initials.equals(module, ignoreCase = true)
        }
    }

    /**
     * Check if a key is contained in the book.
     * JSword Book.contains() returns a Key (not boolean) — truthy if found.
     * Uses try/catch since absent keys throw ArrayIndexOutOfBoundsException.
     */
    private fun bookContains(book: Book, key: org.crosswire.jsword.passage.Key): Boolean {
        return try {
            book.contains(key)
            true
        } catch (e: Exception) {
            false
        }
    }
}
