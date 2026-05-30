package com.bible.text.service

import com.bible.text.entity.Book
import com.bible.text.entity.Translation
import com.bible.text.entity.Verse
import com.bible.text.repository.BookRepository
import com.bible.text.repository.TranslationRepository
import com.bible.text.repository.VerseRepository
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.cache.annotation.CacheEvict
import org.springframework.cache.annotation.Cacheable
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 经文查询服务
 *
 * 核心功能：
 * - 按译本/书卷/章/节查询经文
 * - 随机经文
 * - 译本和书卷列表
 * - 数据导入（供 module-service 调用）
 */
@Service
class BibleTextService(
    private val translationRepository: TranslationRepository,
    private val bookRepository: BookRepository,
    private val verseRepository: VerseRepository,
    @Value("\${bible.text.default-translation:web}")
    private val defaultTranslation: String
) {
    private val logger = LoggerFactory.getLogger(BibleTextService::class.java)

    /**
     * Map friendly book names (e.g. "john", "genesis") → OSIS ID ("jhn", "gen")
     * Supports both English names and OSIS IDs as input, case-insensitive.
     */
    private val bookIdMap: Map<String, String> = mapOf(
        "genesis" to "gen", "exodus" to "exo", "leviticus" to "lev", "numbers" to "num",
        "deuteronomy" to "deu", "joshua" to "jos", "judges" to "jdg", "ruth" to "rut",
        "1samuel" to "1sa", "2samuel" to "2sa", "1kings" to "1ki", "2kings" to "2ki",
        "1chronicles" to "1ch", "2chronicles" to "2ch", "ezra" to "ezr", "nehemiah" to "neh",
        "esther" to "est", "job" to "job", "psalms" to "psa", "psalm" to "psa",
        "proverbs" to "pro", "ecclesiastes" to "ecc", "songofsolomon" to "sng",
        "songofsongs" to "sng", "isaiah" to "isa", "jeremiah" to "jer",
        "lamentations" to "lam", "ezekiel" to "eze", "daniel" to "dan",
        "hosea" to "hos", "joel" to "jol", "amos" to "amo", "obadiah" to "oba",
        "jonah" to "jon", "micah" to "mic", "nahum" to "nam", "habakkuk" to "hab",
        "zephaniah" to "zep", "haggai" to "hag", "zechariah" to "zec", "malachi" to "mal",
        "matthew" to "mat", "mark" to "mrk", "luke" to "luk", "john" to "jhn",
        "acts" to "act", "romans" to "rom", "1corinthians" to "1co", "2corinthians" to "2co",
        "galatians" to "gal", "ephesians" to "eph", "philippians" to "php",
        "colossians" to "col", "1thessalonians" to "1th", "2thessalonians" to "2th",
        "1timothy" to "1ti", "2timothy" to "2ti", "titus" to "tit", "philemon" to "phm",
        "hebrews" to "heb", "james" to "jas", "1peter" to "1pe", "2peter" to "2pe",
        "1john" to "1jn", "2john" to "2jn", "3john" to "3jn", "jude" to "jud",
        "revelation" to "rev"
    )

    /**
     * Match friendly book name to OSIS ID.
     * Tries: exact OSIS match → lowercased/stripped English name → original input
     */
    private fun resolveBookId(input: String): String {
        val normalized = input.lowercase().replace(" ", "").replace("-", "")
        return bookIdMap[normalized] ?: input
    }

    // ==================== 查询接口 ====================

    /**
     * 获取整章经文
     */
    @Cacheable("chapter", key = "'chapter:' + #translation + ':' + #book + ':' + #chapter")
    @Transactional(readOnly = true)
    fun getChapter(translation: String, book: String, chapter: Int): Map<String, Any> {
        logger.debug("获取章节: translation=$translation, book=$book, chapter=$chapter")

        val bookEntity = getBookEntity(translation, book)
            ?: return errorResult("not_found", "书卷不存在: $book (译本: $translation)")

        val verses = getVerses(bookEntity, chapter, 1, 9999)

        return mapOf(
            "translation_id" to translation,
            "book_id" to bookEntity.bookId,
            "book_name" to bookEntity.name,
            "chapter" to chapter,
            "verses" to verses,
            "chapter_count" to bookEntity.chapterCount
        )
    }

    /**
     * 获取单节经文
     */
    @Cacheable("verse", key = "'verse:' + #translation + ':' + #book + ':' + #chapter + ':' + #verse")
    @Transactional(readOnly = true)
    fun getVerse(translation: String, book: String, chapter: Int, verse: Int): Map<String, Any> {
        val bookEntity = getBookEntity(translation, book)
            ?: return errorResult("not_found", "书卷不存在: $book")

        val verseEntity = getVerseEntity(bookEntity, chapter, verse)
            ?: return errorResult("not_found", "经文不存在: $book $chapter:$verse")

        return mapOf(
            "translation_id" to translation,
            "book_id" to bookEntity.bookId,
            "book_name" to bookEntity.name,
            "chapter" to chapter,
            "verse" to verse,
            "text" to verseEntity.text,
            "reference" to "${bookEntity.name} $chapter:$verse"
        )
    }

    /**
     * 获取经文范围
     */
    @Transactional(readOnly = true)
    fun getRange(translation: String, book: String, chapter: Int, verseStart: Int, verseEnd: Int): Map<String, Any> {
        val bookEntity = getBookEntity(translation, book)
            ?: return errorResult("not_found", "书卷不存在: $book")

        val verses = getVerses(bookEntity, chapter, verseStart, verseEnd)

        return mapOf(
            "translation_id" to translation,
            "book_id" to bookEntity.bookId,
            "book_name" to bookEntity.name,
            "chapter" to chapter,
            "verse_start" to verseStart,
            "verse_end" to verseEnd,
            "verses" to verses,
            "reference" to "${bookEntity.name} $chapter:$verseStart-$verseEnd"
        )
    }

    /**
     * 获取随机经文
     */
    @Cacheable("random", key = "'random:' + #translation")
    @Transactional(readOnly = true)
    fun getRandomVerse(translation: String): Map<String, Any> {
        val translationEntity = getTranslationEntity(translation)
            ?: return errorResult("not_found", "译本不存在: $translation")

        val verse = verseRepository.findRandomByTranslation(translationEntity.id!!)
            ?: return errorResult("empty", "译本 $translation 中没有经文")

        val bookEntity = verse.book

        return mapOf(
            "translation_id" to translation,
            "book_id" to bookEntity.bookId,
            "book_name" to bookEntity.name,
            "chapter" to verse.chapter,
            "verse" to verse.verse,
            "text" to verse.text,
            "reference" to "${bookEntity.name} ${verse.chapter}:${verse.verse}"
        )
    }

    /**
     * 列出所有可用译本
     */
    @Cacheable("translations", key = "'all'")
    @Transactional(readOnly = true)
    fun listTranslations(): List<Map<String, Any>> {
        return translationRepository.findByIsActiveTrue().map { t ->
            mapOf(
                "id" to t.code,
                "name" to t.name,
                "language" to t.language,
                "abbreviation" to (t.abbreviation ?: ""),
                "description" to (t.description ?: "")
            )
        }
    }

    /**
     * 列出某译本的所有书卷
     */
    @Cacheable("books", key = "'books:' + #translation")
    @Transactional(readOnly = true)
    fun listBooks(translation: String): List<Map<String, Any>> {
        val translationEntity = getTranslationEntity(translation) ?: return emptyList()
        return bookRepository.findByTranslationOrderByOrderIndex(translationEntity).map { b ->
            mapOf(
                "book_id" to b.bookId,
                "name" to b.name,
                "english_name" to b.englishName,
                "chapter_count" to b.chapterCount,
                "order" to b.orderIndex
            )
        }
    }

    // ==================== 数据导入接口（供 module-service 调用） ====================

    /**
     * 导入圣经数据
     * 
     * @param translationCode 译本代码（如 "kjv", "cuv"）
     * @param translationName 译本名称
     * @param language 语言
     * @param books 书卷列表，每个书卷包含 bookId, name, englishName, osisId, orderIndex, chapterCount
     * @param verses 经文列表，每个经文包含 bookId, chapter, verse, text, verseKey
     */
    @CacheEvict(value = ["translations", "books", "chapter", "verse", "random"], allEntries = true)
    @Transactional
    fun importBibleData(
        translationCode: String,
        translationName: String,
        language: String,
        books: List<Map<String, Any>>,
        verses: List<Map<String, Any>>
    ): Map<String, Any> {
        logger.info("开始导入圣经数据: $translationCode - $translationName")
        
        // 1. 创建或更新译本
        val existingTranslation = translationRepository.findByCode(translationCode)
        val translation: Translation
        
        if (existingTranslation == null) {
            translation = Translation(
                code = translationCode,
                name = translationName,
                language = language,
                abbreviation = translationCode.uppercase(),
                isActive = true
            )
            translationRepository.save(translation)
            logger.info("创建译本: $translationCode")
        } else {
            translation = existingTranslation
            // Only delete old data if this batch includes books (full re-import)
            if (books.isNotEmpty()) {
                logger.info("译本已存在，重新导入覆盖数据: $translationCode")
                bookRepository.findByTranslation(translation).forEach { book ->
                    verseRepository.deleteByBook(book)
                }
                bookRepository.deleteByTranslation(translation)
            } else {
                logger.info("译本已存在，增量导入经文: $translationCode")
            }
        }
        
        // 2. 创建书卷索引
        val bookMap = mutableMapOf<String, Book>()
        // First, load existing books into the map
        bookRepository.findByTranslation(translation).forEach { book ->
            bookMap[book.bookId] = book
        }
        // Then add/create new books from the current batch
        books.forEach { bookData ->
            val bookId = bookData["bookId"] as String
            val existing = bookMap[bookId]
            if (existing != null) {
                // Book already created, skip
            } else {
                val book = Book(
                    translation = translation,
                    bookId = bookId,
                    name = bookData["name"] as String,
                    englishName = bookData["englishName"] as? String ?: bookId,
                    osisId = bookData["osisId"] as? String,
                    orderIndex = (bookData["orderIndex"] as? Number)?.toInt()
                        ?: (bookData["sortOrder"] as? Number)?.toInt() ?: 0,
                    chapterCount = (bookData["chapterCount"] as? Number)?.toInt() ?: 1
                )
                bookMap[bookId] = bookRepository.save(book)
            }
        }
        logger.info("书卷索引: ${bookMap.size} 个")
        
        // 3. 批量导入经文
        var verseCount = 0
        val batchSize = 500
        val verseEntities = mutableListOf<Verse>()
        
        verses.forEach { verseData ->
            val bookId = verseData["bookId"] as? String ?: return@forEach
            val book = bookMap[bookId] ?: return@forEach
            
            verseEntities.add(Verse(
                book = book,
                chapter = (verseData["chapter"] as? Number)?.toInt() ?: 1,
                verse = (verseData["verse"] as? Number)?.toInt() ?: 1,
                text = verseData["text"] as? String ?: "",
                verseKey = verseData["verseKey"] as? String ?: ""
            ))
            
            if (verseEntities.size >= batchSize) {
                verseRepository.saveAll(verseEntities)
                verseCount += verseEntities.size
                verseEntities.clear()
            }
        }
        
        // 保存剩余经文
        if (verseEntities.isNotEmpty()) {
            verseRepository.saveAll(verseEntities)
            verseCount += verseEntities.size
        }
        
        logger.info("导入完成: $translationCode, ${bookMap.size} 卷, $verseCount 节")
        
        return mapOf(
            "status" to "ok",
            "translation" to translationCode,
            "book_count" to bookMap.size,
            "verse_count" to verseCount
        )
    }

    /**
     * 删除译本数据
     */
    @CacheEvict(value = ["translations", "books", "chapter", "verse", "random"], allEntries = true)
    @Transactional
    fun deleteTranslation(translationCode: String): Map<String, Any> {
        val translation = translationRepository.findByCode(translationCode)
            ?: return mapOf("status" to "not_found", "message" to "译本不存在: $translationCode")
        
        bookRepository.findByTranslation(translation).forEach { book ->
            verseRepository.deleteByBook(book)
        }
        bookRepository.deleteByTranslation(translation)
        translationRepository.delete(translation)
        
        logger.info("删除译本: $translationCode")
        return mapOf("status" to "ok", "translation" to translationCode)
    }

    // ==================== 私有辅助方法 ====================

    private fun getBookEntity(translation: String, bookId: String): Book? {
        val t = translationRepository.findByCode(translation) ?: return null
        val resolvedId = resolveBookId(bookId)
        return bookRepository.findByTranslationAndBookIdIgnoreCase(t, resolvedId)
    }

    private fun getTranslationEntity(translation: String): Translation? {
        return translationRepository.findByCode(translation)
    }

    private fun getVerseEntity(book: Book, chapter: Int, verse: Int): Verse? {
        return verseRepository.findByBookAndChapterAndVerse(book, chapter, verse)
    }

    private fun getVerses(book: Book, chapter: Int, verseStart: Int, verseEnd: Int): List<Map<String, Any>> {
        val verses = if (verseStart <= 1 && verseEnd >= 9999) {
            verseRepository.findByBookAndChapterOrderByVerse(book, chapter)
        } else {
            verseRepository.findByBookAndChapterAndVerseBetween(book, chapter, verseStart, verseEnd)
        }
        
        return verses.map { v ->
            mapOf(
                "chapter" to v.chapter,
                "verse" to v.verse,
                "text" to v.text
            )
        }
    }

    private fun errorResult(code: String, message: String): Map<String, Any> {
        return mapOf("error" to code, "message" to message)
    }
}
