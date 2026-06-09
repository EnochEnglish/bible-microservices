package com.bible.sword.config

import jakarta.annotation.PostConstruct
import org.crosswire.jsword.book.Books
import org.crosswire.jsword.book.sword.SwordBookDriver
import org.crosswire.jsword.book.sword.SwordBookPath
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Configuration
import java.io.File

/**
 * Initialize SWORD module discovery at application startup.
 *
 * Each SWORD module lives in its own directory with a standard layout:
 *   {module}/mods.d/{module}.conf   — configuration
 *   {module}/modules/               — data files
 *
 * We scan all subdirectories of the modules-path and register
 * each one as an augment path so JSword discovers all modules.
 */
@Configuration
class SwordConfig {

    @Value("\${sword.modules-path:data/sword-mods}")
    private lateinit var modulesPath: String

    private val logger = LoggerFactory.getLogger(SwordConfig::class.java)

    @PostConstruct
    fun initSword() {
        val baseDir = resolveBaseDir()
        logger.info("Initializing SWORD from base directory: {}", baseDir.absolutePath)

        if (!baseDir.exists() || !baseDir.isDirectory) {
            logger.error("SWORD modules directory not found: {}", baseDir.absolutePath)
            return
        }

        // Find all module subdirectories (each with its own mods.d/ + modules/)
        val moduleDirs = baseDir.listFiles { file ->
            file.isDirectory &&
                !file.name.startsWith(".") &&
                !file.name.startsWith("_") &&
                File(file, "mods.d").exists() &&
                File(file, "modules").exists()
        } ?: emptyArray()

        if (moduleDirs.isEmpty()) {
            logger.warn("No SWORD modules found in {}. Each module needs mods.d/ + modules/ subdirectories.",
                baseDir.absolutePath)
            return
        }

        logger.info("Found {} module directories: {}", moduleDirs.size,
            moduleDirs.map { it.name })

        try {
            // Register each module directory as an augment path
            SwordBookPath.setAugmentPath(moduleDirs)
            SwordBookPath.setDownloadDir(baseDir)

            // Register the SWORD driver (triggers mods.d scan in each directory)
            Books.installed().registerDriver(SwordBookDriver.instance())

            // Log discovered modules
            val allBooks = Books.installed().books
            logger.info("SWORD initialized: {} modules discovered", allBooks.size)

            val byCategory = allBooks.groupBy { it.bookCategory.name }
            byCategory.forEach { (cat, books) ->
                logger.info("  [{}] {} modules:", cat, books.size)
                books.forEach { book ->
                    val meta = book.bookMetaData
                    val desc = meta.getProperty("Description") ?: ""
                    val features = if (meta.hasFeature(org.crosswire.jsword.book.FeatureType.STRONGS_NUMBERS)) " [Strong's]" else ""
                    logger.info("    {} — {}{}", book.initials, desc, features)
                }
            }
        } catch (e: Exception) {
            logger.error("Failed to initialize SWORD: {}", e.message, e)
        }
    }

    private fun resolveBaseDir(): File {
        val path = File(modulesPath)
        if (path.isAbsolute) return path.canonicalFile
        return File(System.getProperty("user.dir") ?: ".", modulesPath).canonicalFile
    }
}
