package com.bible.monolith.dto

/**
 * Metadata for a module available for installation (from a repository source).
 */
data class AvailableModule(
    val name: String,                // module initials, e.g. "ESV2011"
    val description: String,         // display name from .conf
    val category: String,            // "BIBLE", "COMMENTARY", "DICTIONARY", etc.
    val language: String,            // e.g. "en", "zh", "grc"
    val version: String,             // version string from .conf
    val about: String,               // about/description text
    val sourceType: String,          // "OSIS", "TEI", "ThML", "GNT", etc.
    val dataPath: String,            // relative data path for zip download
    val installed: Boolean,          // already installed?
    val sizeEstimate: Long = 0       // rough size estimate (0 = unknown)
)

/**
 * Result of an install operation.
 */
data class InstallResult(
    val success: Boolean,
    val module: String,
    val message: String,
    val details: Map<String, String> = emptyMap()
)

/**
 * Repository source metadata.
 * Mirrors JSword InstallManager.plugin format:
 *   type,name,host,packageDirectory,catalogDirectory
 */
data class RepositoryInfo(
    val id: String,
    val name: String,
    val type: String,           // "sword-https" or "sword-http"
    val host: String,
    val packageDir: String,     // e.g. "/ftpmirror/pub/sword/packages/rawzip"
    val catalogDir: String,     // e.g. "/ftpmirror/pub/sword/raw"
    val description: String,
    val moduleCount: Int = 0
)