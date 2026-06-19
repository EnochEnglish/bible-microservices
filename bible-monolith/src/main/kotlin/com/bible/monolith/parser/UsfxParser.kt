package com.bible.monolith.parser

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import javax.xml.parsers.DocumentBuilderFactory

/**
 * USFX 格式解析器
 *
 * USFX (Unified Scripture XML Format) 是另一种常见的圣经 XML 格式
 * open-bibles 项目中 WEB、BBE、CUV 等使用此格式
 *
 * USFX XML 结构示例：
 * <XMLBIBLE type="x-bible">
 *   <BIBLEBOOK bnumber="1" bname="Genesis">
 *     <CHAPTER cnumber="1">
 *       <VERS vnumber="1">In the beginning...</VERS>
 *     </CHAPTER>
 *   </BIBLEBOOK>
 * </XMLBIBLE>
 */
@Component
class UsfxParser : BibleParser {
    override val format = "usfx"
    private val logger = LoggerFactory.getLogger(UsfxParser::class.java)

    override fun parse(content: String): ParseResult {
        val factory = DocumentBuilderFactory.newInstance()
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)
        val builder = factory.newDocumentBuilder()
        val doc = builder.parse(content.byteInputStream())

        val translationMeta = TranslationMeta(
            identifier = extractIdentifier(doc),
            name = extractName(doc),
            language = "",
            languageCode = "",
            license = "Public Domain",
            sourceFormat = "usfx"
        )

        val books = mutableListOf<BookMeta>()
        val verses = mutableMapOf<String, MutableList<VerseData>>()

        val bookElements = doc.getElementsByTagName("BIBLEBOOK")
        for (i in 0 until bookElements.length) {
            val bookElement = bookElements.item(i)
            val bookNum = bookElement.attributes?.getNamedItem("bnumber")?.nodeValue?.toIntOrNull() ?: (i + 1)
            val bookName = bookElement.attributes?.getNamedItem("bname")?.nodeValue ?: "Book$bookNum"
            val bookId = bookNumberToId(bookNum)

            val bookVerses = mutableListOf<VerseData>()
            val chapters = mutableSetOf<Int>()

            val chapterElements = bookElement.childNodes
            for (j in 0 until chapterElements.length) {
                val chapterElement = chapterElements.item(j)
                if (chapterElement.nodeName != "CHAPTER") continue

                val chapterNum = chapterElement.attributes?.getNamedItem("cnumber")?.nodeValue?.toIntOrNull() ?: continue
                chapters.add(chapterNum)

                val verseElements = chapterElement.childNodes
                for (k in 0 until verseElements.length) {
                    val verseElement = verseElements.item(k)
                    if (verseElement.nodeName != "VERS") continue

                    val verseNum = verseElement.attributes?.getNamedItem("vnumber")?.nodeValue?.toIntOrNull() ?: continue
                    val verseText = verseElement.textContent ?: ""

                    bookVerses.add(VerseData(bookId, chapterNum, verseNum, verseText.trim()))
                }
            }

            books.add(BookMeta(
                bookId = bookId,
                name = bookName,
                abbreviation = bookId.take(3),
                testament = determineTestament(bookId),
                chapterCount = chapters.size,
                sortOrder = bookNum
            ))
            verses[bookId] = bookVerses
        }

        return ParseResult(translationMeta, books, verses)
    }

    private fun extractIdentifier(doc: org.w3c.dom.Document): String {
        val info = doc.getElementsByTagName("INFORMATION")
        if (info.length > 0) {
            val children = info.item(0).childNodes
            for (i in 0 until children.length) {
                if (children.item(i).nodeName == "identifier") {
                    return children.item(i).textContent?.trim() ?: "unknown"
                }
            }
        }
        return "unknown"
    }

    private fun extractName(doc: org.w3c.dom.Document): String {
        val info = doc.getElementsByTagName("INFORMATION")
        if (info.length > 0) {
            val children = info.item(0).childNodes
            for (i in 0 until children.length) {
                if (children.item(i).nodeName == "title") {
                    return children.item(i).textContent?.trim() ?: "Unknown"
                }
            }
        }
        return "Unknown Translation"
    }

    /** 书卷编号转标准 ID */
    private fun bookNumberToId(num: Int): String {
        val bookIds = listOf(
            "GEN","EXO","LEV","NUM","DEU","JOS","JDG","RUT","1SA","2SA",
            "1KI","2KI","1CH","2CH","EZR","NEH","EST","JOB","PSA","PRO",
            "ECC","SNG","ISA","JER","LAM","EZK","DAN","HOS","JOL","AMO",
            "OBA","JON","MIC","NAM","HAB","ZEP","HAG","ZEC","MAL",
            "MAT","MRK","LUK","JHN","ACT","ROM","1CO","2CO","GAL","EPH",
            "PHP","COL","1TH","2TH","1TI","2TI","TIT","PHM","HEB","JAS",
            "1PE","2PE","1JN","2JN","3JN","JUD","REV"
        )
        return if (num in 1..bookIds.size) bookIds[num - 1] else "BOK$num"
    }

    private fun determineTestament(bookId: String): String {
        val otPrefixes = setOf("GEN","EXO","LEV","NUM","DEU","JOS","JDG","RUT","1SA","2SA",
            "1KI","2KI","1CH","2CH","EZR","NEH","EST","JOB","PSA","PRO",
            "ECC","SNG","ISA","JER","LAM","EZK","DAN","HOS","JOL","AMO",
            "OBA","JON","MIC","NAM","HAB","ZEP","HAG","ZEC","MAL")
        return if (bookId in otPrefixes) "OT" else "NT"
    }
}