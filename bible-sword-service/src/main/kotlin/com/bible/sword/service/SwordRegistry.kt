package com.bible.sword.service

import com.bible.sword.dto.ModuleInfo
import org.crosswire.jsword.book.Book
import org.crosswire.jsword.book.Books
import org.crosswire.jsword.book.FeatureType
import org.crosswire.jsword.book.sword.SwordBook
import org.crosswire.jsword.book.sword.SwordBookMetaData
import org.crosswire.jsword.book.sword.SwordBookPath
import org.crosswire.jsword.versification.BibleBook
import org.crosswire.jsword.versification.system.Versifications
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.cache.annotation.CacheEvict
import org.springframework.cache.annotation.Cacheable
import org.springframework.stereotype.Service

/**
 * Manages SWORD module discovery, listing, and metadata.
 */
@Service
class SwordRegistry {

    private val logger = LoggerFactory.getLogger(SwordRegistry::class.java)

    private val books: List<Book> get() = Books.installed().books

    // ─── Module Discovery ───

    @Cacheable("modules")
    fun listModules(category: String? = null): List<ModuleInfo> {
        return books
            .filter { book ->
                category == null || book.bookCategory.name.equals(category, ignoreCase = true)
            }
            .map { toModuleInfo(it) }
    }

    /**
     * Get the raw JSword Book object for passage reading.
     * Not cached — Book objects are live handles.
     */
    fun getBook(initials: String): Book {
        return books.find { it.initials.equals(initials, ignoreCase = true) }
            ?: throw NoSuchElementException("Module not found: $initials")
    }

    @Cacheable("module-detail")
    fun getModule(initials: String): ModuleInfo? {
        return books.find { it.initials.equals(initials, ignoreCase = true) }
            ?.let { toModuleInfo(it) }
    }

    // ─── Bible Navigation ───

    @Cacheable("bible-books")
    fun listBooks(module: String): List<BibleBookInfo> {
        val found = books.find { it.initials.equals(module, ignoreCase = true) }
            ?: throw NoSuchElementException("Module not found: $module")
        val book = found as? SwordBook
            ?: throw IllegalArgumentException("'$module' is not a Bible module (${found.bookCategory})")

        val v11nName = book.bookMetaData.getProperty("Versification") ?: "KJV"
        val versification = Versifications.instance().getVersification(v11nName)

        val result = mutableListOf<BibleBookInfo>()
        val iterator = versification.bookIterator
        while (iterator.hasNext()) {
            val bibleBook = iterator.next()
            // Skip intro/pseudo books
            if (bibleBook === BibleBook.INTRO_BIBLE ||
                bibleBook === BibleBook.INTRO_OT ||
                bibleBook === BibleBook.INTRO_NT) continue

            val lastChapter = versification.getLastChapter(bibleBook)
            var totalVerses = 0
            if (lastChapter > 0) {
                for (ch in 1..lastChapter) {
                    totalVerses += versification.getLastVerse(bibleBook, ch)
                }
            }
            result.add(
                BibleBookInfo(
                    osisId = bibleBook.osis,
                    ordinal = bibleBook.ordinal,
                    chapterCount = lastChapter,
                    totalVerses = totalVerses
                )
            )
        }
        return result
    }

    fun getChapterCount(module: String, bookOsis: String): Int {
        val found = books.find { it.initials.equals(module, ignoreCase = true) }
            ?: throw NoSuchElementException("Module not found: $module")
        val book = found as? SwordBook ?: throw IllegalArgumentException("Not a Bible module")
        val bibleBook = BibleBook.fromOSIS(bookOsis)
        val v11nName = book.bookMetaData.getProperty("Versification") ?: "KJV"
        return Versifications.instance().getVersification(v11nName).getLastChapter(bibleBook)
    }

    @Value("\${sword.modules-path:data/sword-mods}")
    private lateinit var modulesPath: String

    // ─── Module Reload ───

    @CacheEvict(value = ["modules", "module-detail", "bible-books"], allEntries = true)
    fun reloadModules(): Int {
        logger.info("Reloading SWORD modules...")

        // Re-scan augment paths (newly installed modules)
        val pathStr: String = modulesPath
        val cwd: String = System.getProperty("user.dir") ?: "."
        val path: java.io.File = java.io.File(pathStr)
        val baseDir: java.io.File = if (path.isAbsolute) path.canonicalFile
            else java.io.File(cwd, pathStr).canonicalFile

        if (baseDir.exists() && baseDir.isDirectory) {
            val files: Array<java.io.File>? = baseDir.listFiles { file: java.io.File ->
                file.isDirectory &&
                    !file.name.startsWith(".") &&
                    !file.name.startsWith("_") &&
                    java.io.File(file, "mods.d").exists() &&
                    java.io.File(file, "modules").exists()
            }
            val moduleDirs: Array<java.io.File> = files ?: emptyArray()

            if (moduleDirs.isNotEmpty()) {
                logger.info("Updating augment paths with {} module directories", moduleDirs.size)
                SwordBookPath.setAugmentPath(moduleDirs)
                SwordBookPath.setDownloadDir(baseDir)
            }
        }

        Books.installed().registerDriver(
            org.crosswire.jsword.book.sword.SwordBookDriver.instance()
        )
        val count = books.size
        logger.info("Reload complete: {} modules", count)
        return count
    }

    // ─── Private helpers ───

    private fun toModuleInfo(book: Book): ModuleInfo {
        val meta = book.bookMetaData

        // getProperty returns String directly (Java-style, not Optional)
        fun prop(key: String): String = meta.getProperty(key) ?: ""

        // Detect Strong's support
        val hasStrongs = try {
            meta.hasFeature(FeatureType.STRONGS_NUMBERS)
        } catch (_: Exception) { false }

        // Get versification name
        val v11n = prop(SwordBookMetaData.KEY_VERSIFICATION)

        return ModuleInfo(
            initials = book.initials,
            name = prop(SwordBookMetaData.KEY_DESCRIPTION).ifEmpty { book.name },
            description = prop(SwordBookMetaData.KEY_ABOUT),
            category = book.bookCategory.name,
            language = book.language.code,
            languageName = book.language.name,
            hasStrongs = hasStrongs,
            hasFootnotes = try { meta.hasFeature(FeatureType.FOOTNOTES) } catch (_: Exception) { false },
            hasMorphology = try { meta.hasFeature(FeatureType.MORPHOLOGY) } catch (_: Exception) { false },
            versification = v11n.ifEmpty { null },
            configProperties = mapOf(
                "abbreviation" to prop("Abbreviation"),
                "version" to prop("Version"),
                "distributionLicense" to prop("DistributionLicense"),
                "shortCopyright" to prop("ShortCopyright"),
                "shortPromo" to prop("ShortPromo"),
                "category" to prop("Category"),
                "description" to prop(SwordBookMetaData.KEY_DESCRIPTION),
                "encoding" to prop(SwordBookMetaData.KEY_ENCODING),
                "sourceType" to prop(SwordBookMetaData.KEY_SOURCE_TYPE),
                "direction" to prop(SwordBookMetaData.KEY_DIRECTION),
            )
        )
    }
}

data class BibleBookInfo(
    val osisId: String,
    val ordinal: Int,
    val chapterCount: Int,
    val totalVerses: Int
)
