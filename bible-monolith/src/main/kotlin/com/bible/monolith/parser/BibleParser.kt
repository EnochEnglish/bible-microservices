package com.bible.monolith.parser

/**
 * 圣经数据解析器接口
 *
 * 替代 JSword 的 Book/BookDriver 体系：
 * JSword 通过 SWORD 格式驱动读取模块，
 * 我们自己支持 OSIS/USFX/Zefania 三种公开格式
 */
interface BibleParser {
    /** 支持的格式标识 */
    val format: String

    /** 解析圣经数据文件，返回解析结果 */
    fun parse(content: String): ParseResult
}

/**
 * 解析结果
 */
data class ParseResult(
    /** 译本元数据 */
    val translation: TranslationMeta,
    /** 所有书卷 */
    val books: List<BookMeta>,
    /** 所有经文（按书卷分组） */
    val verses: Map<String, List<VerseData>>
)

data class TranslationMeta(
    val identifier: String,
    val name: String,
    val language: String,
    val languageCode: String,
    val license: String,
    val sourceFormat: String
)

data class BookMeta(
    val bookId: String,
    val name: String,
    val abbreviation: String,
    val testament: String,
    val chapterCount: Int,
    val sortOrder: Int
)

data class VerseData(
    val bookId: String,
    val chapter: Int,
    val verse: Int,
    val text: String
)