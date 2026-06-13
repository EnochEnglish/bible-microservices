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
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service

@Service
class GenBookService {

    @Value("\${sword.modules-path:data/sword-mods}")
    private lateinit var modulesPath: String

    private val log = LoggerFactory.getLogger(GenBookService::class.java)

    /**
     * List table-of-contents keys for a GenBook module.
     * DAILY_DEVOTION modules are treated as GENERAL_BOOK by JSword.
     */
    fun listKeys(module: String, offset: Int, limit: Int): GenBookKeysResponse? {
        val book = findBook(module) ?: return null
        val category = book.bookCategory
        if (category != BookCategory.GENERAL_BOOK && category != BookCategory.DAILY_DEVOTIONS && category != BookCategory.MAPS) return null

        // MAPS: enumerate image directories from filesystem
        if (category == BookCategory.MAPS) {
            return listMapKeys(module, book.name, offset, limit)
        }

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
        if (category != BookCategory.GENERAL_BOOK && category != BookCategory.DAILY_DEVOTIONS && category != BookCategory.MAPS) return null

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
     * Detect MIME type from magic bytes. JPEG: FF D8 FF, PNG: 89 50 4E 47, GIF: 47 49 46 38
     */
    private fun detectImageMime(bytes: ByteArray?): String {
        if (bytes == null || bytes.size < 4) return "image/png"
        // Check for SVG (text-based, starts with <svg or <xml)
        val head = String(bytes.copyOfRange(0, kotlin.math.min(bytes.size, 200)), Charsets.UTF_8).trimStart()
        if (head.startsWith("<svg") || head.startsWith("<?xml") || head.contains("<svg")) return "image/svg+xml"
        return when {
            bytes[0] == 0xFF.toByte() && bytes[1] == 0xD8.toByte() -> "image/jpeg"
            bytes[0] == 0x89.toByte() && bytes[1] == 0x50.toByte() -> "image/png"
            bytes[0] == 0x47.toByte() && bytes[1] == 0x49.toByte() -> "image/gif"
            bytes[0] == 0x52.toByte() && bytes[1] == 0x49.toByte() -> "image/webp"
            else -> "image/png"
        }
    }

    /**
     * Get the image file for a MAPS module entry.
     * Returns Pair of (File, mimeType) or null if not found.
     */
    fun getMapImageFile(module: String, keyRef: String): Pair<java.io.File, String>? {
        val book = findBook(module) ?: return null
        if (book.bookCategory != BookCategory.MAPS) return null

        // Walk module directory to find the image
        val baseDir = resolveModulesDir()
        val moduleDir = java.io.File(baseDir, module)
        if (!moduleDir.exists()) return null

        // Look for image in: modules/genbook/rawgenbook/{module}/{module}/{key}/
        val imageDirs = listOf(
            java.io.File(moduleDir, "modules/genbook/rawgenbook/$module/$module/$keyRef"),
            java.io.File(moduleDir, "modules/genbook/rawgenbook/${module.lowercase()}/${module.lowercase()}/$keyRef"),
            java.io.File(moduleDir, "modules/genbook/rawgenbook/${module.lowercase()}/${module.lowercase()}/${keyRef.padStart(5, '0')}")
        )
        for (dir in imageDirs) {
            if (dir.exists()) {
                // Try common image file names
                for (name in listOf("image", "image.jpg", "image.png", "image.jpeg", "image.gif")) {
                    val imgFile = java.io.File(dir, name)
                    if (imgFile.exists()) {
                        val bytes = imgFile.readBytes()
                        val mime = detectImageMime(bytes)
                        return Pair(imgFile, mime)
                    }
                }
            }
        }
        return null
    }

    private fun resolveModulesDir(): java.io.File {
        return java.io.File(modulesPath).canonicalFile
    }

    /**
     * List map keys by scanning image directories on filesystem.
     * Each subdirectory N contains title and image files.
     */
    private fun listMapKeys(module: String, moduleName: String, offset: Int, limit: Int): GenBookKeysResponse {
        val baseDir = resolveModulesDir()
        val imgDir = java.io.File(baseDir, "$module/modules/genbook/rawgenbook/${module.lowercase()}/${module.lowercase()}")

        val keys = mutableListOf<GenBookKeyInfo>()
        if (imgDir.exists() && imgDir.isDirectory) {
            imgDir.listFiles()?.filter { it.isDirectory && it.name.matches(Regex("\\d+")) }?.sortedBy { it.name.toIntOrNull() ?: 0 }?.forEach { dir ->
                val titleFile = java.io.File(dir, "title")
                val title = if (titleFile.exists()) titleFile.readText().trim() else "Map ${dir.name}"
                keys.add(GenBookKeyInfo(
                osisRef = dir.name,
                name = title
            ))
        }
    }

    val sliced = keys.drop(offset).take(limit)
    return GenBookKeysResponse(
        module = module,
        moduleName = moduleName,
        totalCount = keys.size,
        offset = offset,
        returnedCount = sliced.size,
        hasMore = (offset + limit) < keys.size,
        keys = sliced
        )
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
