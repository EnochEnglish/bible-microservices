package com.bible.monolith.service

import com.bible.monolith.dto.GenBookContentResponse
import com.bible.monolith.dto.GenBookKeyInfo
import com.bible.monolith.dto.GenBookKeysResponse
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

    private fun resolveModulesDir(): java.io.File {
        return java.io.File(modulesPath).canonicalFile
    }

    /**
     * Find the genbook tree root for a MAPS module.
     */
    private fun findMapGenBookRoot(module: String): java.io.File? {
        val baseDir = resolveModulesDir()
        val sharedBase = java.io.File(baseDir, "modules/genbook/rawgenbook")
        if (sharedBase.exists()) {
            for (d in sharedBase.listFiles() ?: emptyArray()) {
                if (!d.isDirectory) continue
                if (!d.name.lowercase().startsWith(module.lowercase())) continue
                if (isMapTreeRoot(d)) return d
                for (sub in d.listFiles() ?: emptyArray()) {
                    if (sub.isDirectory && isMapTreeRoot(sub)) return sub
                }
            }
        }
        // Self-contained: {root}/{Module}/modules/genbook/rawgenbook/{name}/{name}
        // Try multiple case variants for cross-platform compatibility (Windows is case-insensitive, Linux is case-sensitive)
        val modVariants = linkedSetOf(module, module.lowercase(), module.uppercase())
        for (outerCase in modVariants) {
            for (innerCase in modVariants) {
                val scDir = java.io.File(baseDir, "$outerCase/modules/genbook/rawgenbook/$innerCase/$innerCase")
                if (scDir.exists() && isMapTreeRoot(scDir)) return scDir
            }
        }
        // Fallback: search {root}/{Module}*/modules/genbook/rawgenbook/**/** (case-insensitive recursive)
        for (modCase in modVariants) {
            val modDir = java.io.File(baseDir, modCase)
            if (!modDir.exists() || !modDir.isDirectory) continue
            val rawDir = java.io.File(modDir, "modules/genbook/rawgenbook")
            if (!rawDir.exists() || !rawDir.isDirectory) continue
            // Search all subdirectories for a map tree root
            val queue = ArrayDeque<java.io.File>()
            queue.add(rawDir)
            while (queue.isNotEmpty()) {
                val current = queue.removeFirst()
                if (isMapTreeRoot(current)) return current
                current.listFiles()?.filter { it.isDirectory }?.forEach { queue.add(it) }
            }
        }
        return null
    }

    private fun isMapTreeRoot(dir: java.io.File): Boolean {
        val hasNumbered = dir.listFiles()?.any { it.isDirectory && it.name.toIntOrNull() != null } ?: false
        val hasImages = java.io.File(dir, "images").let { it.exists() && it.isDirectory }
        val hasTree = dir.listFiles()?.any { it.isFile && (it.name.endsWith(".bdt") || it.name.endsWith(".dat")) } ?: false
        return hasNumbered || hasImages || hasTree
    }

    /**
     * Get image file for MAPS module. Supports numbered-dir and images/ formats.
     */
    fun getMapImageFile(module: String, keyRef: String): Pair<java.io.File, String>? {
        val book = findBook(module) ?: return null
        if (book.bookCategory != BookCategory.MAPS) return null
        val treeRoot = findMapGenBookRoot(module) ?: return null
        // Format 1: Numbered directories {keyRef}/image
        for (dir in listOf(java.io.File(treeRoot, keyRef), java.io.File(treeRoot, keyRef.padStart(5, '0')))) {
            if (dir.exists() && dir.isDirectory) {
                for (name in listOf("image", "image.jpg", "image.png", "image.jpeg", "image.gif")) {
                    val imgFile = java.io.File(dir, name)
                    if (imgFile.exists() && imgFile.isFile) {
                        return Pair(imgFile, detectImageMime(imgFile.readBytes()))
                    }
                }
            }
        }
        // Format 2: images/ subdirectory
        val imagesDir = java.io.File(treeRoot, "images")
        if (imagesDir.exists() && imagesDir.isDirectory) {
            for (ext in listOf("", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp")) {
                val imgFile = java.io.File(imagesDir, "$keyRef$ext")
                if (imgFile.exists() && imgFile.isFile) {
                    return Pair(imgFile, detectImageMime(imgFile.readBytes()))
                }
            }
        }
        return null
    }

    /**
     * List map keys. Format 1: numbered dirs. Format 2: images/ dir.
     */
    private fun listMapKeys(module: String, moduleName: String, offset: Int, limit: Int): GenBookKeysResponse {
        val keys = mutableListOf<GenBookKeyInfo>()
        val treeRoot = findMapGenBookRoot(module)
        if (treeRoot != null) {
            // Format 1: Numbered subdirectories
            for (dir in (treeRoot.listFiles() ?: emptyArray())) {
                if (dir.isDirectory && dir.name.toIntOrNull() != null) {
                    val titleFile = java.io.File(dir, "title")
                    val title = if (titleFile.exists()) titleFile.readText().trim() else "Map ${dir.name}"
                    keys.add(GenBookKeyInfo(osisRef = dir.name, name = title))
                }
            }
            // Format 2: images/ directory
            if (keys.isEmpty()) {
                val imagesDir = java.io.File(treeRoot, "images")
                if (imagesDir.exists() && imagesDir.isDirectory) {
                    for (imgFile in (imagesDir.listFiles() ?: emptyArray())) {
                        if (imgFile.isFile && imgFile.name.matches(Regex(".*\\.(jpg|jpeg|png|gif|svg|webp)$", RegexOption.IGNORE_CASE))) {
                            val dispName = imgFile.nameWithoutExtension
                                .replace('_', ' ').replace('-', ' ')
                                .split(' ').joinToString(" ") { it.replaceFirstChar { c -> c.uppercaseChar() } }
                            keys.add(GenBookKeyInfo(osisRef = imgFile.name, name = dispName))
                        }
                    }
                }
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