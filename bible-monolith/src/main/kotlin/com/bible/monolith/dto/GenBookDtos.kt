package com.bible.monolith.dto

data class GenBookKeyInfo(
    val name: String,
    val osisRef: String
)

data class GenBookKeysResponse(
    val module: String,
    val moduleName: String,
    val totalCount: Int,
    val offset: Int,
    val returnedCount: Int,
    val hasMore: Boolean,
    val keys: List<GenBookKeyInfo>
)

data class GenBookContentResponse(
    val module: String,
    val moduleName: String,
    val key: String,
    val keyName: String,
    val content: String?,
    val found: Boolean,
    val message: String? = null
)
