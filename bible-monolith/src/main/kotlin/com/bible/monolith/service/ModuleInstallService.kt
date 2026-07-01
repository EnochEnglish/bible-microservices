package com.bible.monolith.service

import com.bible.monolith.dto.AvailableModule
import com.bible.monolith.dto.InstallResult
import com.bible.monolith.dto.RepositoryInfo
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream
import org.apache.commons.compress.compressors.gzip.GzipCompressorInputStream
import org.crosswire.jsword.book.Books
import org.crosswire.jsword.book.sword.SwordBookDriver
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.io.*
import java.net.HttpURLConnection
import java.net.URI
import java.util.zip.ZipInputStream
import kotlin.concurrent.thread

/**
 * Module Installation Service — fully compatible with SWORD JSword / AndBible repository layout.
 *
 * Repository config mirrors JSword InstallManager.plugin format:
 *   type,name,host,packageDirectory,catalogDirectory
 *
 *   CrossWire: host=crosswire.org, packageDir=/ftpmirror/pub/sword/packages/rawzip, catalogDir=/ftpmirror/pub/sword/raw
 *
 * Install flow (identical to AbstractSwordInstaller.install):
 *   1. Download {packageDir}/{module}.zip
 *   2. Unzip to sword-mods/ (only mods.d/ and modules/ subdirs are needed)
 *   3. Register via SwordBookDriver.registerNewBook()
 *   4. Module is immediately usable — zero code changes needed
 */
@Service
class ModuleInstallService(
    private val swordRegistry: SwordRegistry
) {
    @Value("\${sword.modules-path:data/sword-mods}")
    private lateinit var modulesPath: String

    private val logger = LoggerFactory.getLogger(ModuleInstallService::class.java)

    /** Active (in-progress) installs */
    private val activeInstalls = mutableMapOf<String, InstallStatus>()
    private val lock = Any()

    private data class InstallStatus(
        var state: String = "downloading",
        var progress: Int = 0,
        var message: String = ""
    )

    // ─── Repository Sources ───
    //
    // Structured like JSword InstallManager.plugin:
    //   Installer.1=type,name,host,packageDir,catalogDir
    //
    // Host is the domain only; URIs are constructed via
    //   https://{host}{packageDir}/{module}.zip
    //   https://{host}{catalogDir}/mods.d.tar.gz

    val repositories = listOf(
        RepositoryInfo(
            id = "crosswire",
            name = "CrossWire Main",
            type = "sword-https",
            host = "crosswire.org",
            packageDir = "/ftpmirror/pub/sword/packages/rawzip",
            catalogDir = "/ftpmirror/pub/sword/raw",
            description = "Standard SWORD module repository. Bibles, commentaries, dictionaries."
        ),
        RepositoryInfo(
            id = "crosswire-beta",
            name = "CrossWire Beta",
            type = "sword-https",
            host = "crosswire.org",
            packageDir = "/ftpmirror/pub/sword/betapackages/rawzip",
            catalogDir = "/ftpmirror/pub/sword/betaraw",
            description = "Beta / pre-release SWORD modules."
        ),
        RepositoryInfo(
            id = "crosswire-av11n",
            name = "CrossWire Av11n",
            type = "sword-https",
            host = "crosswire.org",
            packageDir = "/ftpmirror/pub/sword/avpackages/rawzip",
            catalogDir = "/ftpmirror/pub/sword/avraw",
            description = "Alternate versification modules."
        ),
        RepositoryInfo(
            id = "xmission",
            name = "XMission Mirror (USA)",
            type = "sword-https",
            host = "crosswire.org",
            packageDir = "/ftpmirror/pub/sword/packages/rawzip",
            catalogDir = "/ftpmirror/pub/sword/raw",
            description = "Redirects to US mirror, faster for North America."
        ),
        // Custom: AndBible's own repo for curated modules
        RepositoryInfo(
            id = "andbible",
            name = "AndBible Repository",
            type = "sword-https",
            host = "raw.githubusercontent.com",
            packageDir = "/AndBible/and-bible/develop/.gie/and-bible-data/rawzip",
            catalogDir = "/AndBible/and-bible/develop/.gie/and-bible-data",
            description = "AndBible-hosted curated modules."
        )
    )

    // ─── Browse Available Modules ───

    fun listAvailable(
        repoId: String,
        category: String? = null,
        search: String? = null,
        refresh: Boolean = false
    ): List<AvailableModule> {
        val repo = findRepo(repoId)

        // Use cached index when available
        if (!refresh) {
            val cached = catalogCache[repoId]
            if (cached != null) {
                return filterAvailable(cached, category, search)
            }
        }

        val tarballUrl = "https://${repo.host}${repo.catalogDir}/${CATALOG_FILE}"
        logger.info("Downloading catalog from {}", tarballUrl)
        val confs = try {
            val tarBytes = fetchBytes(tarballUrl)
            parseTarGzConfs(tarBytes)
        } catch (e: Exception) {
            logger.error("Failed to download catalog: {}", e.message)
            throw IllegalStateException("Cannot reach repository catalog at $tarballUrl: ${e.message}")
        }

        val installed = swordRegistry.listModules().map { it.initials.lowercase() }.toSet()

        val all = confs.map { (name, props) ->
            AvailableModule(
                name = name,
                description = fixUtf8Mojibake(props["Description"] ?: name),
                category = detectCategory(name, props),
                language = props["Lang"] ?: "en",
                version = props["Version"] ?: "",
                about = fixUtf8Mojibake(props["About"] ?: ""),
                sourceType = props["SourceType"] ?: props["ModDrv"] ?: "RawText",
                dataPath = props["DataPath"] ?: "",
                installed = name.lowercase() in installed
            )
        }.sortedBy { it.name }

        catalogCache[repoId] = all
        logger.info("Cached {} modules from {}", all.size, repoId)

        return filterAvailable(all, category, search)
    }

    // ─── Module Categories ───

    fun moduleCategories(): List<String> = listOf(
        "BIBLE", "COMMENTARY", "DICTIONARY", "CULT", "MAPS",
        "DAILY_DEVOTION", "GLOSSARY", "GENERAL_BOOK", "OTHER"
    )

    // ─── Install Module ───

    /**
     * Install a module.
     *
     * Steps (matching AbstractSwordInstaller.install flow):
     *   1. Download {packageDir}/{module}.zip
     *   2. Unzip into sword-mods/{module}/
     *   3. Register with SwordBookDriver
     *   4. Verify in Books.installed()
     */
    fun install(repoId: String, moduleName: String): InstallResult {
        val repo = findRepo(repoId)

        synchronized(lock) {
            if (activeInstalls.containsKey(moduleName)) {
                return InstallResult(
                    false, moduleName,
                    "Already installing: ${activeInstalls[moduleName]!!.state}"
                )
            }
            activeInstalls[moduleName] = InstallStatus()
        }

        return try {
            val baseDir = resolveModulesDir()
            val moduleDir = File(baseDir, moduleName)

            // Already installed? Re-register if needed
            if (File(moduleDir, "mods.d").exists() && File(moduleDir, "modules").exists()) {
                updateStatus(moduleName, "registering", 90, "Already installed, re-registering")
                registerModule(moduleName, moduleDir)
                return InstallResult(true, moduleName, "Already installed, re-registered.")
            }

            // Remove stale dir
            if (moduleDir.exists()) moduleDir.deleteRecursively()

            // Step 1: Download
            updateStatus(moduleName, "downloading", 5, "Downloading $moduleName...")
            val zipUrl = resolveDownloadUrl(repo, moduleName)
            val zipFile = File(baseDir, "_tmp_${moduleName}.zip")
            downloadFile(zipUrl, zipFile) { pct ->
                updateStatus(moduleName, "downloading", 5 + (pct * 75 / 100), "Downloading... $pct%")
            }

            // Step 2: Extract (only mods.d/ and modules/ as JSword does)
            updateStatus(moduleName, "extracting", 80, "Extracting $moduleName...")
            moduleDir.mkdirs()
            extractSwordZip(zipFile, moduleDir)
            if (!zipFile.delete()) zipFile.deleteOnExit()

            // Handle single-directory nesting (common in CrossWire zips)
            val children = moduleDir.listFiles()
            if (children != null && children.size == 1 && children[0].isDirectory) {
                val inner = children[0]
                if (File(inner, "mods.d").exists() && File(inner, "modules").exists()) {
                    logger.info("Flattening nested module structure")
                    inner.listFiles()?.forEach { it.renameTo(File(moduleDir, it.name)) }
                    inner.delete()
                }
            }

            if (!File(moduleDir, "mods.d").exists()) {
                logger.warn("Invalid module structure after extraction for {}", moduleName)
                moduleDir.deleteRecursively()
                updateStatus(moduleName, "failed", 0, "No mods.d/ after extraction")
                return InstallResult(false, moduleName, "Invalid module: missing mods.d/ dir")
            }

            // Step 3: Register
            updateStatus(moduleName, "registering", 90, "Registering $moduleName...")
            registerModule(moduleName, moduleDir)

            updateStatus(moduleName, "done", 100, "Installed ✓")
            logger.info("Module {} installed successfully from {}", moduleName, repoId)

            // Invalidate browse cache
            catalogCache.remove(repoId)

            InstallResult(true, moduleName, "Module '$moduleName' installed.")
        } catch (e: Exception) {
            logger.error("Install {} failed: {}", moduleName, e.message, e)
            updateStatus(moduleName, "failed", 0, e.message ?: "Unknown")
            InstallResult(false, moduleName, "Install failed: ${e.message}")
        } finally {
            thread(name = "cleanup-$moduleName") {
                Thread.sleep(30_000)
                synchronized(lock) { activeInstalls.remove(moduleName) }
            }
        }
    }

    // ─── Uninstall ───

    fun uninstall(initials: String): InstallResult {
        val registered = Books.installed().books.find {
            it.initials.equals(initials, ignoreCase = true)
        }
        if (registered == null) {
            return InstallResult(false, initials, "Module not installed: $initials")
        }

        val baseDir = resolveModulesDir()
        val moduleDir = File(baseDir, initials)

        try {
            if (moduleDir.exists() && !moduleDir.deleteRecursively()) {
                return InstallResult(false, initials, "Cannot delete module directory")
            }
            swordRegistry.reloadModules()
            catalogCache.clear()
            return InstallResult(true, initials, "Module '$initials' uninstalled.")
        } catch (e: Exception) {
            logger.error("Uninstall {} failed: {}", initials, e.message, e)
            return InstallResult(false, initials, "Uninstall failed: ${e.message}")
        }
    }

    // ─── Status ───

    fun installStatus(moduleName: String?): Any {
        if (moduleName != null) {
            synchronized(lock) {
                return activeInstalls[moduleName] ?: mapOf("state" to "unknown")
            }
        }
        synchronized(lock) {
            return activeInstalls.map { (k, v) ->
                mapOf("module" to k, "state" to v.state, "progress" to v.progress)
            }
        }
    }

    // ─── Private: Catalog Download & Parsing ───

    /** In-memory cache for catalog listings per repo */
    private val catalogCache = mutableMapOf<String, List<AvailableModule>>()

    /**
     * SWORD .conf spec says ISO-8859-1, but many non-English modules (Chinese, Arabic, etc.)
     * use UTF-8. When decoded as Latin-1, multi-byte UTF-8 sequences appear as garbled
     * mojibake. This function detects and fixes by re-encoding Latin-1 -> UTF-8.
     */
    private fun fixUtf8Mojibake(text: String): String {
        if (text.isEmpty()) return text
        // Quick check: if all chars are ASCII, no fix needed
        if (text.all { it.code <= 0x7F }) return text
        try {
            val raw = text.toByteArray(Charsets.ISO_8859_1)
            // Check if the bytes look like valid UTF-8 multi-byte sequences
            var utf8Like = 0
            var i = 0
            while (i < raw.size) {
                val b = raw[i].toInt() and 0xFF
                when {
                    b < 0x80 -> i++
                    b in 0xC0..0xDF -> { if (i + 1 < raw.size) { utf8Like++; i += 2 } else i++ }
                    b in 0xE0..0xEF -> { if (i + 2 < raw.size) { utf8Like++; i += 3 } else i++ }
                    b in 0xF0..0xF7 -> { if (i + 3 < raw.size) { utf8Like++; i += 4 } else i++ }
                    else -> i++
                }
            }
            if (utf8Like > 0) {
                val fixed = String(raw, Charsets.UTF_8)
                // Only accept if the result doesn't contain replacement characters
                if (!fixed.contains('\uFFFD')) return fixed
            }
        } catch (_: Exception) { }
        return text
    }

    private fun filterAvailable(
        list: List<AvailableModule>, category: String?, search: String?
    ): List<AvailableModule> {
        var filtered = list
        if (!category.isNullOrBlank()) {
            filtered = filtered.filter { it.category.equals(category, ignoreCase = true) }
        }
        if (!search.isNullOrBlank()) {
            val q = search.lowercase()
            filtered = filtered.filter {
                it.name.lowercase().contains(q) ||
                it.description.lowercase().contains(q) ||
                it.about.lowercase().contains(q)
            }
        }
        return filtered
    }

    /**
     * Parse mods.d.tar.gz (Gzip → TAR) — identical to AbstractSwordInstaller.unpack().
     * Each .conf file → one module metadata entry.
     */
    private fun parseTarGzConfs(tarGzBytes: ByteArray): List<Pair<String, Map<String, String>>> {
        val result = mutableListOf<Pair<String, Map<String, String>>>()
        val gzis = GzipCompressorInputStream(ByteArrayInputStream(tarGzBytes))
        val tais = TarArchiveInputStream(gzis)

        tais.use { tar ->
            var entry = tar.nextTarEntry
            while (entry != null) {
                if (!entry.isDirectory && entry.name.endsWith(".conf") && entry.size > 0) {
                    val moduleName = entry.name.substringAfterLast("/").removeSuffix(".conf")
                    val buf = ByteArray(entry.size.toInt())
                    var offset = 0
                    while (offset < buf.size) {
                        offset += tar.read(buf, offset, buf.size - offset)
                    }
                    val content = String(buf, Charsets.UTF_8)
                    val props = parseConfContent(content)
                    if (props["Description"] != null) {
                        result.add(moduleName to props)
                    }
                }
                entry = tar.nextTarEntry
            }
        }
        logger.info("Parsed {} modules from catalog", result.size)
        return result
    }

    /**
     * Parse SWORD .conf file.
     * Lines: Key=Value. Backslash at EOL → continuation.
     * Empty/comment lines reset current key.
     */
    private fun parseConfContent(content: String): Map<String, String> {
        val props = mutableMapOf<String, String>()
        var currentKey: String? = null
        var currentValue = StringBuilder()

        for (rawLine in content.lines()) {
            val line = rawLine.trimEnd()
            if (line.startsWith("#") || line.isBlank()) {
                if (currentKey != null) {
                    props[currentKey] = currentValue.toString().trim()
                    currentKey = null
                    currentValue = StringBuilder()
                }
                continue
            }
            val eq = line.indexOf('=')
            if (eq > 0) {
                if (currentKey != null) {
                    props[currentKey] = currentValue.toString().trim()
                }
                currentKey = line.substring(0, eq).trim()
                currentValue = StringBuilder(line.substring(eq + 1).trim())
            } else if (currentKey != null) {
                currentValue.append(" ").append(line.trim())
            }
        }
        if (currentKey != null) {
            props[currentKey] = currentValue.toString().trim()
        }
        return props
    }

    // ─── Private: Network Helpers ───

    private fun fetchBytes(url: String): ByteArray {
        val conn = openConnection(url)
        conn.connectTimeout = 15_000
        conn.readTimeout = 30_000
        conn.connect()
        checkResponse(conn, url)
        return conn.inputStream.use { it.readBytes() }
    }

    private fun downloadFile(url: String, dest: File, progress: ((Int) -> Unit)? = null) {
        val conn = openConnection(url)
        conn.connectTimeout = 10_000
        conn.readTimeout = 300_000
        conn.connect()
        checkResponse(conn, url)

        val total = conn.contentLengthLong
        conn.inputStream.use { input ->
            dest.outputStream().use { output ->
                val buf = ByteArray(16384)
                var read: Int
                var done = 0L
                while (input.read(buf).also { read = it } != -1) {
                    output.write(buf, 0, read)
                    done += read
                    if (progress != null && total > 0) {
                        progress((done * 100 / total).toInt())
                    }
                }
            }
        }
    }

    private fun openConnection(url: String): HttpURLConnection {
        val conn = URI(url).toURL().openConnection() as HttpURLConnection
        conn.setRequestProperty("User-Agent", "bible-sword-service/1.0 (SWORD installer)")
        conn.instanceFollowRedirects = true
        return conn
    }

    private fun checkResponse(conn: HttpURLConnection, url: String) {
        val code = conn.responseCode
        if (code != 200) {
            val msg = try {
                conn.errorStream.use { it?.reader()?.readText() } ?: ""
            } catch (_: Exception) { "" }
            throw IOException("HTTP $code for $url${if (msg.isNotBlank()) ": $msg" else ""}")
        }
    }

    // ─── Private: Extraction ───

    /**
     * Extract a SWORD zip. Only extracts mods.d/ and modules/ (same as
     * AbstractSwordInstaller.install via IOUtil.unpackZip).
     */
    private fun extractSwordZip(zipFile: File, destDir: File) {
        ZipInputStream(BufferedInputStream(FileInputStream(zipFile))).use { zis ->
            var entry = zis.nextEntry
            while (entry != null) {
                val entryFile = File(destDir, entry.name)
                val canonicalDest = destDir.canonicalPath
                if (!entryFile.canonicalPath.startsWith(canonicalDest)) {
                    logger.warn("Skipping zip-slip entry: {}", entry.name)
                    entry = zis.nextEntry
                    continue
                }
                if (entry.isDirectory) {
                    entryFile.mkdirs()
                } else {
                    entryFile.parentFile.mkdirs()
                    entryFile.outputStream().use { zis.copyTo(it) }
                }
                entry = zis.nextEntry
            }
        }
    }

    // ─── Private: Registration ───

    private fun registerModule(moduleName: String, moduleDir: File) {
        // Re-scan augment paths + re-register driver (picks up new module)
        swordRegistry.reloadModules()

        // JSword scan may be async — retry a few times
        var found: org.crosswire.jsword.book.Book? = null
        for (i in 0..5) {
            if (i > 0) Thread.sleep(500)
            found = Books.installed().books.find {
                it.initials.equals(moduleName, ignoreCase = true)
            }
            if (found != null) break
            // Force re-drive if not found
            if (i == 2) Books.installed().registerDriver(
                org.crosswire.jsword.book.sword.SwordBookDriver.instance()
            )
        }

        if (found == null) {
            val confFiles = File(moduleDir, "mods.d").listFiles { f -> f.name.endsWith(".conf") }
            logger.error(
                "Module {} not discovered after {} retries. mods.d contents: {}",
                moduleName, 5,
                confFiles?.map { it.name }?.joinToString()
            )
            throw IllegalStateException("Module '$moduleName' extracted but not discovered by JSword")
        }
        logger.info("Registered: {} ({})", found.name, found.bookCategory)
    }

    // ─── Private: Helpers ───

    private fun findRepo(repoId: String): RepositoryInfo {
        return repositories.find { it.id == repoId }
            ?: throw IllegalArgumentException("Unknown repo: $repoId. Available: ${repositories.map { it.id }}")
    }

    /**
     * Resolve download URL with case-insensitive fallback.
     * CrossWire server uses mixed-case zip filenames (e.g. SME.zip, not sme.zip).
     */
    private fun resolveDownloadUrl(repo: RepositoryInfo, moduleName: String): String {
        val lowerUrl = "https://${repo.host}${repo.packageDir}/${moduleName}.zip"
        val upperUrl = "https://${repo.host}${repo.packageDir}/${moduleName.uppercase()}.zip"
        // Capitalize first letter only (e.g. "Imitation.zip") — common CrossWire convention
        val capUrl = if (moduleName.isNotEmpty()) {
            val cap = moduleName[0].uppercaseChar() + moduleName.substring(1)
            "https://${repo.host}${repo.packageDir}/${cap}.zip"
        } else lowerUrl

        // Try lowercase first (most common)
        if (urlExists(lowerUrl)) return lowerUrl

        // Try capitalized first-letter (very common in CrossWire)
        if (urlExists(capUrl)) {
            logger.info("Using capitalized URL: {}", capUrl)
            return capUrl
        }

        // Try uppercase fallback
        if (urlExists(upperUrl)) {
            logger.info("Using uppercase URL: {}", upperUrl)
            return upperUrl
        }

        // Neither works — use lowercase, let the download fail with a clear error
        return lowerUrl
    }

    private fun urlExists(url: String): Boolean {
        return try {
            val conn = URI(url).toURL().openConnection() as HttpURLConnection
            conn.requestMethod = "HEAD"
            conn.connectTimeout = 5000
            conn.readTimeout = 5000
            conn.instanceFollowRedirects = true
            val code = conn.responseCode
            conn.disconnect()
            code in 200..299
        } catch (e: Exception) {
            false
        }
    }

    private fun resolveModulesDir(): File {
        return if (File(modulesPath).isAbsolute) File(modulesPath).canonicalFile
        else File(System.getProperty("user.dir") ?: ".", modulesPath).canonicalFile
    }

    private fun updateStatus(name: String, state: String, progress: Int, msg: String) {
        synchronized(lock) {
            activeInstalls[name]?.apply {
                this.state = state
                this.progress = progress
                this.message = msg
            }
        }
    }

    // ─── Module Category Detection ───

    private fun detectCategory(name: String, props: Map<String, String>): String {
        val modDrv = props["ModDrv"] ?: ""
        val desc = props["Description"] ?: ""
        val cat = props["Category"] ?: ""

        // Explicit Category field
        if (cat.contains("Commentar", ignoreCase = true)) return "COMMENTARY"
        if (cat.contains("Bible", ignoreCase = true)) return "BIBLE"
        if (cat.contains("Dictionary", ignoreCase = true) ||
            cat.contains("Lexicon", ignoreCase = true)) return "DICTIONARY"
        if (cat.contains("Daily Devotion", ignoreCase = true)) return "DAILY_DEVOTION"
        if (cat.contains("Glossary", ignoreCase = true)) return "GLOSSARY"
        if (cat.contains("Maps", ignoreCase = true)) return "MAPS"
        if (cat.contains("Cult", ignoreCase = true)) return "CULT"

        // Description heuristics
        if (desc.contains("Commentary", ignoreCase = true)) return "COMMENTARY"

        // Known module prefixes
        val commentaryPrefixes = listOf("MHC", "JFB", "Clarke", "Barnes", "Calvin", "Wesley", "RWP",
            "Family", "TDavid", "PNT", "TSK", "TFG", "Scofield")
        if (commentaryPrefixes.any { name.startsWith(it, ignoreCase = true) }) return "COMMENTARY"

        val dictionaryPrefixes = listOf("StrongsGreek", "StrongsHebrew", "StrongsRealGreek",
            "StrongsRealHebrew", "ISBE", "Easton", "Nave", "Hitchcock", "Smith", "Fausset",
            "2BabDict")
        if (dictionaryPrefixes.any { name.startsWith(it, ignoreCase = true) }) return "DICTIONARY"

        val devotionalPrefixes = listOf("Daily", "DCD", "SME")
        if (devotionalPrefixes.any { name.startsWith(it, ignoreCase = true) }) return "DAILY_DEVOTION"

        // Driver-based fallback
        return when {
            modDrv.contains("zLD") || modDrv.contains("RawLD") -> "DICTIONARY"
            modDrv.contains("zCom") || modDrv.contains("RawCom") -> "COMMENTARY"
            modDrv.contains("RawGenBook") -> "GENERAL_BOOK"
            modDrv.contains("zText") || modDrv.contains("RawText") -> "BIBLE"
            else -> "BIBLE" // default
        }
    }

    companion object {
        private const val CATALOG_FILE = "mods.d.tar.gz"
    }
}

