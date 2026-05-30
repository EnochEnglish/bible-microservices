package com.bible.module.service

import com.bible.module.parser.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service

/**
 * 模块管理服务
 *
 * 替代 JSword 的 Books.installed() 和 Installer 体系
 * 自己管理圣经数据的导入和元数据
 */
@Service
class ModuleService(
    private val parsers: List<BibleParser>,
    @Value("\${bible.text-service.url:http://localhost:8081}")
    private val textServiceUrl: String
) {
    private val logger = LoggerFactory.getLogger(ModuleService::class.java)
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    /** 格式 -> 解析器映射 */
    private val parserMap: Map<String, BibleParser> by lazy {
        parsers.associateBy { it.format }
    }

    /**
     * 列出可用的译本源（来自 open-bibles 项目）
     */
    fun listAvailableSources(): List<Map<String, String>> {
        return listOf(
            mapOf("identifier" to "kjv", "name" to "King James Version", "format" to "osis",
                "language" to "English", "url" to "https://raw.githubusercontent.com/seven1m/open-bibles/master/eng-kjv.osis.xml"),
            mapOf("identifier" to "web", "name" to "World English Bible", "format" to "usfx",
                "language" to "English", "url" to "https://raw.githubusercontent.com/seven1m/open-bibles/master/eng-web.usfx.xml"),
            mapOf("identifier" to "cuv", "name" to "Chinese Union Version (Traditional)", "format" to "usfx",
                "language" to "Chinese", "url" to "https://raw.githubusercontent.com/seven1m/open-bibles/master/chi-cuv.usfx.xml"),
            mapOf("identifier" to "cuv-simp", "name" to "Chinese Union Version (Simplified)", "format" to "usfx",
                "language" to "Chinese", "url" to "https://raw.githubusercontent.com/seven1m/open-bibles/master/chi-cuv-simp.usfx.xml"),
            mapOf("identifier" to "asv", "name" to "American Standard Version", "format" to "zefania",
                "language" to "English", "url" to "https://raw.githubusercontent.com/seven1m/open-bibles/master/eng-asv.zefania.xml"),
            mapOf("identifier" to "bbe", "name" to "Bible in Basic English", "format" to "usfx",
                "language" to "English", "url" to "https://raw.githubusercontent.com/seven1m/open-bibles/master/eng-bbe.usfx.xml"),
            mapOf("identifier" to "darby", "name" to "Darby Bible", "format" to "zefania",
                "language" to "English", "url" to "https://raw.githubusercontent.com/seven1m/open-bibles/master/eng-darby.zefania.xml"),
        )
    }

    /**
     * 导入圣经数据
     */
    fun importData(content: String, format: String): Map<String, Any> {
        val detectedFormat = if (format == "auto") detectFormat(content) else format
        val parser = parserMap[detectedFormat]
            ?: throw IllegalArgumentException("不支持的格式: $detectedFormat")

        val result = parser.parse(content)
        logger.info("解析完成: {}, {} 书, {} 节", result.translation.name, result.books.size,
            result.verses.values.sumOf { it.size })

        // 调用 text-service 导入数据
        val importResult = writeToTextService(result)
        
        return mapOf(
            "status" to "ok",
            "translation" to result.translation.name,
            "book_count" to result.books.size,
            "verse_count" to result.verses.values.sumOf { it.size },
            "import_result" to importResult
        )
    }

    /**
     * 从 URL 下载并导入
     */
    fun importFromUrl(url: String, format: String): Map<String, Any> {
        val request = Request.Builder().url(url).build()
        val response = httpClient.newCall(request).execute()
        val content = response.body?.string() ?: throw RuntimeException("下载失败: $url")
        return importData(content, format)
    }

    /**
     * 列出已安装译本（从 text-service 获取）
     */
    fun listInstalled(): List<Map<String, Any>> {
        return try {
            val request = Request.Builder()
                .url("$textServiceUrl/api/v1/bible/translations")
                .build()
            val response = httpClient.newCall(request).execute()
            val body = response.body?.string() ?: return emptyList()
            parseTranslationsResponse(body)
        } catch (e: Exception) {
            logger.error("获取已安装译本失败: {}", e.message)
            emptyList()
        }
    }

    /**
     * 卸载译本（调用 text-service 删除）
     */
    fun uninstall(translation: String) {
        logger.info("卸载译本: {}", translation)
        try {
            val request = Request.Builder()
                .delete()
                .url("$textServiceUrl/api/v1/bible/import/$translation")
                .build()
            httpClient.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    logger.info("卸载成功: {}", translation)
                } else {
                    logger.error("卸载失败: {}", response.code)
                }
            }
        } catch (e: Exception) {
            logger.error("卸载译本失败: {}", e.message)
        }
    }

    /** 自动检测 XML 格式 */
    private fun detectFormat(content: String): String {
        return when {
            content.contains("<osis") || content.contains("osisText") -> "osis"
            content.contains("<XMLBIBLE") && content.contains("type=\"x-bible\"") -> "usfx"
            content.contains("<XMLBIBLE") -> "zefania"
            else -> throw IllegalArgumentException("无法识别的圣经数据格式")
        }
    }

    /**
     * 将解析结果写入 text-service
     */
    private fun writeToTextService(result: ParseResult): Map<String, Any> {
        // 构造请求数据
        val books = result.books.map { book ->
            mapOf(
                "bookId" to book.bookId,
                "name" to book.name,
                "englishName" to book.bookId,
                "osisId" to book.abbreviation,
                "orderIndex" to book.sortOrder,
                "chapterCount" to book.chapterCount
            )
        }

        val verses = result.verses.values.flatten().map { verse ->
            mapOf(
                "bookId" to verse.bookId,
                "chapter" to verse.chapter,
                "verse" to verse.verse,
                "text" to verse.text,
                "verseKey" to "${verse.bookId}.${verse.chapter}.${verse.verse}"
            )
        }

        val requestBody = mapOf(
            "translationCode" to result.translation.identifier,
            "translationName" to result.translation.name,
            "language" to result.translation.language,
            "books" to books,
            "verses" to verses
        )

        // 发送 POST 请求到 text-service
        val json = objectMapper.writeValueAsString(requestBody)
        val request = Request.Builder()
            .url("$textServiceUrl/api/v1/bible/import")
            .post(json.toRequestBody("application/json".toMediaType()))
            .build()

        val response = httpClient.newCall(request).execute()
        val responseBody = response.body?.string()
        
        if (!response.isSuccessful) {
            throw RuntimeException("导入到 text-service 失败: ${response.code} - $responseBody")
        }

        logger.info("成功写入 text-service: {}", result.translation.identifier)
        return objectMapper.readValue(responseBody, Map::class.java) as Map<String, Any>
    }

    /**
     * 解析 text-service 返回的译本列表
     */
    private fun parseTranslationsResponse(json: String): List<Map<String, Any>> {
        val map = objectMapper.readValue(json, Map::class.java)
        @Suppress("UNCHECKED_CAST")
        return map["translations"] as? List<Map<String, Any>> ?: emptyList()
    }

    private val objectMapper = com.fasterxml.jackson.module.kotlin.jacksonObjectMapper()
}