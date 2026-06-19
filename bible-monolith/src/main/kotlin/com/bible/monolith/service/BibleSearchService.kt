package com.bible.monolith.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import okhttp3.OkHttpClient
import okhttp3.Request
import org.apache.lucene.analysis.cn.smart.SmartChineseAnalyzer
import org.apache.lucene.analysis.standard.StandardAnalyzer
import org.apache.lucene.document.Document
import org.apache.lucene.document.Field
import org.apache.lucene.document.IntPoint
import org.apache.lucene.document.StoredField
import org.apache.lucene.document.StringField
import org.apache.lucene.document.TextField
import org.apache.lucene.index.DirectoryReader
import org.apache.lucene.index.IndexWriter
import org.apache.lucene.index.IndexWriterConfig
import org.apache.lucene.queryparser.classic.QueryParser
import org.apache.lucene.search.IndexSearcher
import org.apache.lucene.search.ScoreDoc
import org.apache.lucene.search.TopDocs
import org.apache.lucene.search.highlight.Highlighter
import org.apache.lucene.search.highlight.QueryScorer
import org.apache.lucene.search.highlight.SimpleHTMLFormatter
import org.apache.lucene.store.FSDirectory
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.nio.file.Path
import java.util.concurrent.TimeUnit

/**
 * 基于 Lucene 的圣经全文检索服务
 *
 * 替代 JSword 的搜索功能：
 * - 自己管理 Lucene 索引
 * - 支持中英文搜索
 * - 搜索结果高亮
 */
@Service
class BibleSearchService(
    @Value("\${bible.search.index-path:./data/search-index}")
    private val indexPath: String
) {
    private val logger = LoggerFactory.getLogger(BibleSearchService::class.java)

    // Chinese translation IDs
    private val chineseTranslations = setOf("cuv_gb", "cuv", "cuv_tw")
    // Greek translation IDs (polytonic Greek needs diacritic normalization)
    private val greekTranslations = setOf("lxx", "byz")
    // Hebrew translation IDs (niqqud/cantillation marks need stripping)
    private val hebrewTranslations = setOf("oshb")

    private fun isChinese(translation: String) = chineseTranslations.contains(translation.lowercase())
    private fun isGreek(translation: String) = greekTranslations.contains(translation.lowercase())
    private fun isHebrew(translation: String) = hebrewTranslations.contains(translation.lowercase())

    /**
     * Normalize text by stripping combining diacritical marks.
     * Greek: "θεὸς" → "θεος", "κύριος" → "κυριος"
     * Hebrew: "אֱלֹהִים" → "אלהים", "בְּרֵאשִׁית" → "בראשית"
     * This makes text searchable without requiring exact diacritic matches.
     */
    private fun normalizeText(text: String): String {
        val decomposed = java.text.Normalizer.normalize(text, java.text.Normalizer.Form.NFKD)
        // Remove all combining marks: Greek (U+0300-U+036F, U+1DC0-U+1DFF) + Hebrew niqqud/cantillation (U+05B0-U+05CF, U+05D0-U+05EA base letters)
        return decomposed.replace(Regex("[\\p{Mn}]"), "")
    }

    /**
     * 根据译本语言选择合适的分词器
     */
    private fun getAnalyzer(translation: String) =
        if (isChinese(translation)) SmartChineseAnalyzer() else StandardAnalyzer()

    /**
     * 执行全文搜索
     */
    fun search(query: String, translation: String, page: Int, size: Int): Map<String, Any> {
        val indexDir = Path.of(indexPath, translation)
        
        // 检查索引目录是否存在且包含数据
        if (!java.nio.file.Files.exists(indexDir)) {
            logger.warn("索引目录不存在: $indexDir")
            return emptyResult(query, translation, page, size)
        }
        
        val directory = FSDirectory.open(indexDir)
        
        // 检查索引是否为空
        val reader = try {
            DirectoryReader.open(directory)
        } catch (e: org.apache.lucene.index.IndexNotFoundException) {
            logger.warn("索引为空或不存在: $translation")
            directory.close()
            return emptyResult(query, translation, page, size)
        } catch (e: Exception) {
            logger.error("打开索引失败: ${e.message}")
            directory.close()
            return emptyResult(query, translation, page, size)
        }
        
        // 检查是否有文档
        if (reader.numDocs() == 0) {
            logger.warn("索引中无文档: $translation")
            reader.close()
            directory.close()
            return emptyResult(query, translation, page, size)
        }
        
        val searcher = IndexSearcher(reader)
        val analyzer = getAnalyzer(translation)
        val parser = QueryParser("text", analyzer)

        // Normalize search query for Greek/Hebrew (strip diacritics so unaccented queries match)
        val normalizedQuery = if (isGreek(translation) || isHebrew(translation)) normalizeText(query) else query
        val luceneQuery = parser.parse(normalizedQuery)
        val totalHits = searcher.count(luceneQuery)

        val topDocs: TopDocs = searcher.search(luceneQuery, size * (page + 1))

        // 高亮器
        val formatter = SimpleHTMLFormatter("<em>", "</em>")
        val highlighter = Highlighter(formatter, QueryScorer(luceneQuery))

        val results = topDocs.scoreDocs
            .drop(page * size)
            .map { scoreDoc ->
                val doc = searcher.doc(scoreDoc.doc)
                val text = doc.get("text") ?: ""
                val highlighted = try {
                    highlighter.getBestFragment(analyzer, "text", text) ?: text
                } catch (e: Exception) {
                    text
                }

                mapOf(
                    "book_id" to (doc.get("book_id") ?: ""),
                    "book_name" to (doc.get("book_name") ?: ""),
                    "chapter" to (doc.get("chapter")?.toIntOrNull() ?: 0),
                    "verse" to (doc.get("verse")?.toIntOrNull() ?: 0),
                    "text" to text.trim(),
                    "highlighted" to highlighted,
                    "score" to scoreDoc.score
                )
            }

        reader.close()
        directory.close()

        return mapOf(
            "query" to query,
            "translation_id" to translation,
            "total" to totalHits,
            "page" to page,
            "size" to size,
            "results" to results
        )
    }
    
    /**
     * 返回空结果
     */
    private fun emptyResult(query: String, translation: String, page: Int, size: Int): Map<String, Any> {
        return mapOf(
            "query" to query,
            "translation_id" to translation,
            "total" to 0,
            "page" to page,
            "size" to size,
            "results" to emptyList<Any>(),
            "message" to "索引不存在或为空，请先通过 module-service 导入圣经数据"
        )
    }

    /**
     * 搜索建议
     */
    fun suggest(query: String): List<String> {
        // TODO: 基于 Lucene Suggest 实现
        return emptyList()
    }

    // HTTP client for calling text-service
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()
    private val objectMapper = ObjectMapper()

    // Configured text-service URL
    @Value("\${bible.text-service.url:http://localhost:8081}")
    private lateinit var textServiceUrl: String

    /**
     * 为指定译本构建索引
     *
     * 从 bible-text-service 获取所有经文，建立 Lucene 索引
     */
    fun buildIndex(translation: String) {
        val startTime = System.currentTimeMillis()
        val directory = FSDirectory.open(Path.of(indexPath, translation))
        val analyzer = getAnalyzer(translation)
        val config = IndexWriterConfig(analyzer)
        config.openMode = IndexWriterConfig.OpenMode.CREATE

        IndexWriter(directory, config).use { writer ->
            // 1. 获取该译本的所有书卷
            val books = fetchBooks(translation)
            logger.info("译本 $translation: 共 ${books.size} 卷书，开始索引...")

            var totalVerses = 0

            for (book in books) {
                val bookId = book["book_id"] as String
                val bookName = book["name"] as String
                val chapterCount = (book["chapter_count"] as Number).toInt()
                if (chapterCount <= 0) continue

                var bookStartVerses = totalVerses
                for (ch in 1..chapterCount) {
                    val verses = fetchChapter(translation, bookId, ch)
                    if (verses != null) {
                        for (verse in verses) {
                            @Suppress("UNCHECKED_CAST")
                            val verseMap = verse as Map<String, Any>
                            val verseNum = (verseMap["verse"] as Number).toInt()
                            val rawText = verseMap["text"] as? String ?: continue
                            // Strip diacritical marks for Greek/Hebrew searchability
                            val text = if (isGreek(translation) || isHebrew(translation)) normalizeText(rawText) else rawText

                            val doc = Document()
                            doc.add(StringField("translation", translation, Field.Store.YES))
                            doc.add(StringField("book_id", bookId, Field.Store.YES))
                            doc.add(TextField("book_name", bookName, Field.Store.YES))
                            doc.add(IntPoint("chapter", ch))
                            doc.add(StoredField("chapter", ch))
                            doc.add(IntPoint("verse", verseNum))
                            doc.add(StoredField("verse", verseNum))
                            doc.add(TextField("text", text, Field.Store.YES))
                            writer.addDocument(doc)
                            totalVerses++
                        }
                    }
                }
                logger.info("  [$translation] $bookName: ${totalVerses - bookStartVerses} verses (total $totalVerses)")
            }

            writer.commit()
            val elapsed = (System.currentTimeMillis() - startTime) / 1000
            logger.info("索引构建完成: $translation, 共 $totalVerses 节经文, 耗时 ${elapsed}s")
        }
        directory.close()
    }

    /**
     * 从 text-service 获取某译本的所有书卷列表
     */
    private fun fetchBooks(translation: String): List<Map<String, Any>> {
        val json = httpGet("$textServiceUrl/api/v1/bible/$translation/books") ?: return emptyList()
        val node = objectMapper.readTree(json)
        val booksNode = node.get("books") ?: return emptyList()
        return objectMapper.readValue(booksNode.toString())
    }

    /**
     * 获取某译本的某章经文
     */
    private fun fetchChapter(translation: String, bookId: String, chapter: Int): List<Map<String, Any>>? {
        val json = httpGet("$textServiceUrl/api/v1/bible/$translation/$bookId/$chapter") ?: return null
        return try {
            val node = objectMapper.readTree(json)
            val versesNode = node.get("verses") ?: return null
            objectMapper.readValue(versesNode.toString())
        } catch (e: Exception) {
            logger.warn("Parse chapter failed $translation/$bookId/$chapter: ${e.message}")
            null
        }
    }

    /**
     * HTTP GET 请求
     */
    private fun httpGet(url: String): String? {
        return try {
            val request = Request.Builder().url(url).get().build()
            httpClient.newCall(request).execute().use { response ->
                if (response.isSuccessful) response.body?.string() else null
            }
        } catch (e: Exception) {
            logger.error("HTTP GET 失败: $url - ${e.message}")
            null
        }
    }
}