package com.bible.sword.dto

/**
 * SWORD module metadata exposed via API.
 */
data class ModuleInfo(
    val initials: String,
    val name: String,
    val description: String,
    val category: String,
    val language: String,
    val languageName: String,
    val hasStrongs: Boolean,
    val hasFootnotes: Boolean,
    val hasMorphology: Boolean,
    val versification: String?,
    val configProperties: Map<String, String>
)
