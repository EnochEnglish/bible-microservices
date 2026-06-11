package com.bible.module.parser

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import org.w3c.dom.Document
import org.w3c.dom.Node
import javax.xml.parsers.DocumentBuilderFactory

/**
 * OSIS (Open Scripture Information Standard) parser.
 *
 * Handles BOTH verse models defined by the OSIS standard:
 *
 * 1. MILESTONE MODEL (used by KJV, WEB, and most open-bibles):
 *    <verse osisID="Gen.1.1" sID="Gen.1.1.seID.X" n="1" />
 *    In the beginning God created...
 *    <verse eID="Gen.1.1.seID.X" />
 *
 *    Chapter milestones work the same way:
 *    <chapter osisRef="Gen.1" sID="Gen.1.seID.X" n="1" />
 *
 * 2. CONTAINER MODEL (fallback for simpler OSIS files):
 *    <verse osisID="Gen.1.1">In the beginning...</verse>
 *
 * The parser walks the DOM tree in document order, tracking chapter/verse
 * state via milestone markers and accumulating text between them.
 */
@Component
class OsisParser : BibleParser {
    override val format = "osis"
    private val logger = LoggerFactory.getLogger(OsisParser::class.java)

    override fun parse(content: String): ParseResult {
        val factory = DocumentBuilderFactory.newInstance()
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)
        val builder = factory.newDocumentBuilder()
        val doc = builder.parse(content.byteInputStream())

        // Extract translation metadata
        val translationMeta = extractTranslationMeta(doc)

        val books = mutableListOf<BookMeta>()
        val verses = mutableMapOf<String, MutableList<VerseData>>()

        // Find all book divs
        val bookDivs = doc.getElementsByTagName("div")
        for (i in 0 until bookDivs.length) {
            val bookDiv = bookDivs.item(i)
            val type = bookDiv.attributes?.getNamedItem("type")?.nodeValue
            if (type != "book") continue

            val osisID = bookDiv.attributes?.getNamedItem("osisID")?.nodeValue ?: continue
            val bookId = osisID.uppercase()

            // Extract verses using document-order walk
            val (chapters, bookVerses) = extractBookContent(bookDiv, bookId)

            if (chapters.isEmpty() && bookVerses.isEmpty()) {
                logger.debug("OSIS: book {} has no chapters/verses, skipping", bookId)
                continue
            }

            books.add(BookMeta(
                bookId = bookId,
                name = osisID,
                abbreviation = bookId.take(3),
                testament = determineTestament(bookId),
                chapterCount = chapters.size,
                sortOrder = i
            ))
            verses[bookId] = bookVerses
        }

        val totalVerses = verses.values.sumOf { it.size }
        logger.info("OSIS: parsed {} books, {} verses", books.size, totalVerses)

        return ParseResult(translationMeta, books, verses)
    }

    /**
     * Extract book content by walking the DOM in document order.
     * Tracks chapter state via <chapter sID="..." n="X" /> markers
     * and verse state via <verse sID="..." n="X" /> markers.
     */
    private fun extractBookContent(
        bookDiv: Node,
        bookId: String
    ): Pair<MutableSet<Int>, MutableList<VerseData>> {
        val chapters = mutableSetOf<Int>()
        val bookVerses = mutableListOf<VerseData>()

        var currentChapter = 0
        var currentVerseNum = 0
        var verseText = StringBuilder()

        // Recursive document-order walk
        fun walk(node: Node) {
            when {
                node.nodeType == Node.TEXT_NODE -> {
                    if (currentVerseNum > 0) {
                        verseText.append(node.nodeValue)
                    }
                }

                node.nodeName == "chapter" -> {
                    val sID = node.attributes?.getNamedItem("sID")?.nodeValue
                    val n = node.attributes?.getNamedItem("n")?.nodeValue?.toIntOrNull()
                    if (sID != null && n != null) {
                        // Milestone mode: chapter start
                        currentChapter = n
                        chapters.add(n)
                    }
                    // In container mode, chapter has child nodes
                    // handled by recursing below
                }

                node.nodeName == "verse" -> {
                    val sID = node.attributes?.getNamedItem("sID")?.nodeValue
                    val eID = node.attributes?.getNamedItem("eID")?.nodeValue
                    val n = node.attributes?.getNamedItem("n")?.nodeValue?.toIntOrNull()
                    val osisID = node.attributes?.getNamedItem("osisID")?.nodeValue

                    if (sID != null) {
                        // MILESTONE START: flush previous verse and start new
                        if (currentVerseNum > 0 && verseText.isNotEmpty()) {
                            bookVerses.add(VerseData(bookId, currentChapter, currentVerseNum,
                                verseText.toString().trim()))
                        }
                        currentVerseNum = n ?: 0
                        verseText = StringBuilder()
                    } else if (eID != null) {
                        // MILESTONE END: save current verse
                        if (currentVerseNum > 0) {
                            bookVerses.add(VerseData(bookId, currentChapter, currentVerseNum,
                                verseText.toString().trim()))
                        }
                        currentVerseNum = 0
                        verseText = StringBuilder()
                    } else {
                        // CONTAINER MODEL: <verse>text</verse>
                        val verseNum = osisID?.split(".")?.lastOrNull()?.toIntOrNull() ?: return
                        val text = node.textContent ?: ""
                        bookVerses.add(VerseData(bookId, currentChapter, verseNum, text.trim()))
                    }
                }

                else -> {
                    // Recurse into child nodes for elements like <p>, <div>, etc.
                    if (node.hasChildNodes()) {
                        for (i in 0 until node.childNodes.length) {
                            walk(node.childNodes.item(i))
                        }
                    }
                }
            }
        }

        for (i in 0 until bookDiv.childNodes.length) {
            walk(bookDiv.childNodes.item(i))
        }

        // Save last verse if still open
        if (currentVerseNum > 0 && verseText.isNotEmpty()) {
            bookVerses.add(VerseData(bookId, currentChapter, currentVerseNum,
                verseText.toString().trim()))
        }

        return Pair(chapters, bookVerses)
    }

    /**
     * Extract translation metadata from the OSIS document.
     */
    private fun extractTranslationMeta(doc: Document): TranslationMeta {
        val osisTextElements = doc.getElementsByTagName("osisText")
        val osisText = if (osisTextElements.length > 0) osisTextElements.item(0) else null
        val identifier = osisText?.attributes?.getNamedItem("osisIDWork")?.nodeValue ?: "unknown"

        // Clean up identifier (strip prefix, e.g. "Bible.en.kjv" -> "kjv")
        val cleanId = if (identifier.contains(".")) {
            identifier.substringAfterLast(".")
        } else {
            identifier
        }

        val name = extractTranslationName(doc)

        return TranslationMeta(
            identifier = cleanId,
            name = name,
            language = "",
            languageCode = "",
            license = "Public Domain",
            sourceFormat = "osis"
        )
    }

    private fun extractTranslationName(doc: Document): String {
        val workElements = doc.getElementsByTagName("work")
        if (workElements.length > 0) {
            val work = workElements.item(0)
            for (i in 0 until work.childNodes.length) {
                if (work.childNodes.item(i).nodeName == "title") {
                    return work.childNodes.item(i).textContent ?: "Unknown Translation"
                }
            }
        }
        return "Unknown Translation"
    }

    private fun determineTestament(bookId: String): String {
        val otBooks = setOf(
            "GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT",
            "1SA", "2SA", "1KI", "2KI", "1CH", "2CH", "EZR", "NEH",
            "EST", "JOB", "PSA", "PRO", "ECC", "SNG", "ISA", "JER",
            "LAM", "EZK", "DAN", "HOS", "JOL", "AMO", "OBA", "JON",
            "MIC", "NAM", "HAB", "ZEP", "HAG", "ZEC", "MAL"
        )
        return if (bookId in otBooks) "OT" else "NT"
    }
}
