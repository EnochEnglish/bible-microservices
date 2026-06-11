package com.bible.sword.service

import com.bible.sword.dto.*
import org.crosswire.jsword.book.Book
import org.crosswire.jsword.book.FeatureType
import org.crosswire.jsword.book.sword.SwordBook
import org.crosswire.jsword.passage.*
import org.crosswire.jsword.versification.Versification
import org.crosswire.jsword.versification.system.Versifications
import org.springframework.cache.annotation.Cacheable
import org.springframework.stereotype.Service

/**
 * Passage service that preserves OSIS/ThML semantic tags instead of stripping them.
 *
 * Semantic tags handled:
 *   <w>            — ThML <sync type="Strongs">  equivalent: word-level lemma/morph/Strong's
 *   <note>         — footnote annotations
 *   <reference>    — cross-references (target passage links)
 *   <scripRef>     — literal scripture references (CCEL/ThML variant)
 *   <foreign>      — non-English word markup
 *   <transChange>  — translator additions (preserve text, mark as added)
 *   <divineName>   — divine name rendering (preserve text)
 */
@Service
class SwordPassageService(private val swordRegistry: SwordRegistry) {

    companion object {
        private const val STRONGS_LEMMA_PREFIX = "strong:"
        private const val STRONGS_MORPH_PREFIX = "robinson:"
    }

    /**
     * Get verses with optional Strong's word data, footnotes, and cross-references.
     *
     * Reference format: "Gen.1" (chapter), "Gen.1.1" (verse),
     * "Gen.1.1-Gen.1.5" (range).
     */
    @Cacheable("passage", key = "#module + ':' + #reference")
    fun getPassage(module: String, reference: String): List<VerseInfo> {
        val book = swordRegistry.getBook(module)
        val hasStrongs = try {
            book.bookMetaData.hasFeature(FeatureType.STRONGS_NUMBERS)
        } catch (_: Exception) { false }

        val v11n = getVersification(book)
        val key = resolveKey(v11n, reference)

        val verses = mutableListOf<VerseInfo>()
        val iterator = key.iterator()
        while (iterator.hasNext()) {
            val subKey = iterator.next()
            if (subKey is Verse) {
                val verseKey = book.getKey(subKey.osisRef)
                val rawText = try {
                    book.getRawText(verseKey)
                } catch (e: Exception) {
                    continue
                }

                val parts = subKey.osisRef.split('.')
                val (text, words, footnotes, crossRefs) = parseOsisLine(rawText, hasStrongs)

                verses.add(
                    VerseInfo(
                        osisId = subKey.osisRef,
                        bookName = parts.getOrNull(0) ?: "",
                        chapter = parts.getOrNull(1)?.toIntOrNull() ?: 0,
                        verse = parts.getOrNull(2)?.toIntOrNull() ?: 0,
                        text = text,
                        words = words,
                        footnotes = footnotes,
                        crossRefs = crossRefs
                    )
                )
            }
        }

        return verses
    }

    // ═══════════════════════════════════════════════════════════
    //  Semantic OSIS / ThML parser
    // ═══════════════════════════════════════════════════════════

    /**
     * Parse a single verse's raw OSIS text, preserving all semantic tags.
     *
     * Strategy: scan linearly through the text. When we hit a recognized
     * opening tag, find its matching close tag, extract content, and
     * dispatch processing by tag name. Text between tags becomes plain
     * display text.
     *
     * ── Ghost-character fix ──
     * Some OSIS modules (e.g. ChiUns Gen.1:2) have free text between
     * &lt;/w&gt; and &lt;w&gt; that belongs to the following word\:
     *   &lt;w lemma="strong:H08415"&gt;渊&lt;/w&gt;面&lt;w lemma="strong:H05921"&gt;&lt;/w&gt;
     * Here "面" is between tags, but semantically it's the text of the
     * empty &lt;w&gt;.  We buffer inter-tag text in `pendingPlainText` and
     * inject it as the word's text when the next &lt;w&gt; has empty content.
     */
    private fun parseOsisLine(raw: String, hasStrongs: Boolean): VerseParseResult {
        if (raw.isBlank()) {
            return VerseParseResult(raw, emptyList(), emptyList(), emptyList())
        }

        val words = mutableListOf<WordInfo>()
        val footnotes = mutableListOf<FootnoteInfo>()
        val crossRefs = mutableListOf<CrossRefInfo>()
        val textBuilder = StringBuilder()

        var pos = 0
        val len = raw.length
        var pendingPlainText: String? = null  // free text buffered for next <w>

        while (pos < len) {
            // Find next '<' that starts a tag
            val tagStart = raw.indexOf('<', pos)
            if (tagStart < 0) {
                // No more tags — flush pending then remaining plain text
                if (pendingPlainText != null) {
                    textBuilder.append(pendingPlainText!!)
                    pendingPlainText = null
                }
                textBuilder.append(decodeEntities(raw.substring(pos)))
                break
            }

            // Append text between current position and tag start
            if (tagStart > pos) {
                val between = raw.substring(pos, tagStart)
                if (between.isNotEmpty()) {
                    val decoded = decodeEntities(between)
                    // Non-blank inter-tag text → buffer for possible empty <w>
                    if (decoded.isNotBlank()) {
                        // Flush previous pending (can only happen if previous
                        // <w> was non-empty — the pending text is real free text)
                        if (pendingPlainText != null) {
                            textBuilder.append(pendingPlainText!!)
                        }
                        pendingPlainText = decoded.trim()
                    } else if (decoded.contains(' ')) {
                        textBuilder.append(' ')  // preserve word separator
                    }
                }
            }

            // Try to match a paired tag: <tagname attrs>content</tagname>
            val tagInfo = matchPairedTag(raw, tagStart)
            if (tagInfo != null) {
                dispatchTag(tagInfo, words, footnotes, crossRefs, textBuilder, hasStrongs, pendingPlainText)
                pendingPlainText = null  // consumed by dispatchTag
                pos = tagInfo.endPos
            } else {
                // Self-closing tag: <tagname attrs/>
                val selfClose = matchSelfClosingTag(raw, tagStart)
                if (selfClose != null) {
                    dispatchSelfClosingTag(selfClose, words)
                    pos = selfClose.endPos
                } else {
                    // Not a tag we can parse — consume '<' as text, flush pending
                    if (pendingPlainText != null) {
                        textBuilder.append(pendingPlainText!!)
                        pendingPlainText = null
                    }
                    textBuilder.append(raw[pos])
                    pos++
                }
            }
        }

        val cleanText = textBuilder.toString().trim()
            .replace(Regex("\\s+"), " ")

        return VerseParseResult(
            text = cleanText,
            words = words.ifEmpty { null }.let { it ?: emptyList() },
            footnotes = footnotes.ifEmpty { null }.let { it ?: emptyList() },
            crossRefs = crossRefs.ifEmpty { null }.let { it ?: emptyList() }
        )
    }

    // ─── Tag matching helpers ───

    private data class TagMatch(
        val tagName: String,
        val attrs: String,
        val content: String,
        val startPos: Int,
        val endPos: Int,  // position after </tagName>
        val fullMatch: String
    )

    /** Match <tagName attrs>content</tagName> */
    private fun matchPairedTag(raw: String, startPos: Int): TagMatch? {
        // Find end of opening tag: <tagName attrs>
        val openEnd = raw.indexOf('>', startPos)
        if (openEnd < 0) return null

        val openTag = raw.substring(startPos + 1, openEnd).trim()
        // Extract tag name (first word before space or /)
        val spaceIdx = openTag.indexOf(' ')
        val tagName = if (spaceIdx > 0) openTag.substring(0, spaceIdx) else openTag

        if (tagName.isEmpty() || tagName[0] == '/') return null

        // Find matching close tag
        val closeTag = "</$tagName>"
        val closeIdx = raw.indexOf(closeTag, openEnd + 1)
        if (closeIdx < 0) return null

        val attrs = if (spaceIdx > 0) openTag.substring(spaceIdx + 1) else ""
        val content = raw.substring(openEnd + 1, closeIdx)

        return TagMatch(
            tagName = tagName,
            attrs = attrs,
            content = content,
            startPos = startPos,
            endPos = closeIdx + closeTag.length,
            fullMatch = raw.substring(startPos, closeIdx + closeTag.length)
        )
    }

    private data class SelfClosingTag(
        val tagName: String,
        val attrs: String,
        val endPos: Int
    )

    /** Match <tagName attrs/> */
    private fun matchSelfClosingTag(raw: String, startPos: Int): SelfClosingTag? {
        val endPos = raw.indexOf("/>", startPos)
        if (endPos < 0) return null
        val inner = raw.substring(startPos + 1, endPos).trim()
        val spaceIdx = inner.indexOf(' ')
        val tagName = if (spaceIdx > 0) inner.substring(0, spaceIdx) else inner
        if (tagName.isEmpty()) return null
        val attrs = if (spaceIdx > 0) inner.substring(spaceIdx + 1) else ""
        return SelfClosingTag(tagName, attrs, endPos + 2)
    }

    // ─── Tag dispatchers ───

    /**
     * Route a paired tag to the correct handler based on tag name.
     * Unknown/unrecognized tags just have their inner content preserved as text.
     */
    private fun dispatchTag(
        tag: TagMatch,
        words: MutableList<WordInfo>,
        footnotes: MutableList<FootnoteInfo>,
        crossRefs: MutableList<CrossRefInfo>,
        textBuilder: StringBuilder,
        hasStrongs: Boolean,
        pendingPlainText: String? = null
    ) {
        when (tag.tagName.lowercase()) {
            "w" -> {
                // Ghost-character fix (v2): when this <w> has empty content and
                // there is buffered plain text (free text between </w> and <w>),
                // inject that text as the word’s text.
                // Example: <w>渊</w>面<w lemma="strong:H05921"></w>
                //   → word text="面" (from inter-tag buffer), not ""
                // When <w> has its own content, flush buffered text FIRST
                // (it’s the free text before this tag, e.g. "地" before <w>是</w>).
                if (hasStrongs) {
                    var wordText = tag.content.trim()
                    if (wordText.isEmpty() && pendingPlainText != null) {
                        // Ghost-word: consume buffered free text as word content
                        wordText = pendingPlainText!!
                    } else {
                        // Normal word: flush preceding free text to display
                        if (pendingPlainText != null) {
                            textBuilder.append(pendingPlainText!!)
                        }
                    }
                    val word = parseWordTag(tag.attrs, wordText)
                    words.add(word)
                    textBuilder.append(decodeEntities(wordText))
                } else {
                    // No Strong’s: flush pending then append plain content
                    if (pendingPlainText != null) {
                        textBuilder.append(pendingPlainText!!)
                    }
                    textBuilder.append(decodeEntities(tag.content.trim()))
                }
            }
            "note" -> {
                if (pendingPlainText != null) {
                    textBuilder.append(pendingPlainText!!)
                }
                val fn = parseNoteTag(tag.attrs, tag.content)
                footnotes.add(fn)
                // Don't append note content to display text (it's a footnote)
            }
            "reference", "scripref" -> {
                if (pendingPlainText != null) {
                    textBuilder.append(pendingPlainText!!)
                }
                val xref = parseCrossRefTag(tag.attrs, tag.content)
                crossRefs.add(xref)
                // Append the display text (the reference itself IS part of the text)
                textBuilder.append(decodeEntities(tag.content.trim()))
            }
            "foreign" -> {
                // Flush pending before foreign text
                if (pendingPlainText != null) {
                    textBuilder.append(pendingPlainText!!)
                }
                textBuilder.append(decodeEntities(tag.content.trim()))
            }
            "transchange" -> {
                if (pendingPlainText != null) {
                    textBuilder.append(pendingPlainText!!)
                }
                textBuilder.append(decodeEntities(tag.content.trim()))
            }
            "divinename" -> {
                if (pendingPlainText != null) {
                    textBuilder.append(pendingPlainText!!)
                }
                textBuilder.append(decodeEntities(tag.content.trim()))
            }
            "q" -> {
                // Quoted text — flush pending then preserve
                if (pendingPlainText != null) {
                    textBuilder.append(pendingPlainText!!)
                }
                textBuilder.append(decodeEntities(tag.content.trim()))
            }
            else -> {
                // Unknown tag — flush pending text first, then preserve content
                if (pendingPlainText != null) {
                    textBuilder.append(pendingPlainText!!)
                }
                textBuilder.append(decodeEntities(tag.content.trim()))
            }
        }
    }

    private fun dispatchSelfClosingTag(
        tag: SelfClosingTag,
        words: MutableList<WordInfo>
    ) {
        when (tag.tagName.lowercase()) {
            "w" -> {
                // Self-closing <w/> — still might have Strong's data
                val word = parseWordTag(tag.attrs, "")
                if (word.text.isNotEmpty()) {
                    words.add(word)
                }
            }
            "milestone" -> { /* ignore milestones */ }
            else -> { /* ignore other self-closing tags */ }
        }
    }

    // ─── Semantic tag parsers ───

    /**
     * Parse <w> tag — ThML <sync type="Strongs"> equivalent.
     *
     * Attributes: lemma="strong:G2424" lemma.TR="ιησου" morph="robinson:N-NSM" src="1"
     */
    private fun parseWordTag(attrs: String, content: String): WordInfo {
        // Strong's number(s) from lemma="strong:G2424" or lemma="strong:H7225 strong:H0430"
        val strongsNumbers = mutableListOf<String>()
        val allLemmaValues = Regex("""lemma="([^"]*)"""").findAll(attrs)
        for (match in allLemmaValues) {
            val value = match.groupValues[1]
            val parts = value.split("\\s+".toRegex())
            for (part in parts) {
                if (part.startsWith(STRONGS_LEMMA_PREFIX)) {
                    strongsNumbers.add(part.removePrefix(STRONGS_LEMMA_PREFIX))
                }
            }
        }

        // Actual lemma (original language word) from lemma.TR, lemma.GNT, etc.
        val lemmaClean = extractLemmaValue(attrs)

        // Morphology code
        val morph = Regex("""morph="([^"]*)"""").find(attrs)?.groupValues?.get(1)
        val morphClean = morph
            ?.removePrefix("strongMorph:")
            ?.removePrefix(STRONGS_MORPH_PREFIX)
            ?.removePrefix("robinson:")  // one more variant

        // Source index
        val src = Regex("""src="([^"]*)"""").find(attrs)?.groupValues?.get(1)

        // Foreign language from lemma attribute namespace
        val foreignLang = detectLemmaLanguage(attrs)

        return WordInfo(
            text = content.trim(),
            strongs = strongsNumbers.ifEmpty { null }?.joinToString("+"),
            lemma = lemmaClean,
            morph = morphClean,
            foreignLang = foreignLang,
            src = src
        )
    }

    /**
     * Extract the real lemma value (original language word) from various
     * attribute namespaces. The primary lemma="strong:G2424" is just a
     * Strong's ID reference; the actual Greek/Hebrew word is in
     * lemma.TR, lemma.GNT, etc.
     */
    private fun extractLemmaValue(attrs: String): String? {
        // Try common lemma namespaces in order of preference
        val namespaces = listOf("lemma.TR", "lemma.GNT", "lemma.Strongs", "lemma.LXX")
        for (ns in namespaces) {
            // Need to escape the dot for regex, or use string matching
            val pattern = Regex("""$ns="([^"]*)"""")
            val value = pattern.find(attrs)?.groupValues?.get(1)
            if (value != null && value.isNotBlank()) return value
        }
        return null
    }

    /**
     * Detect lemma language from attribute namespace patterns.
     */
    private fun detectLemmaLanguage(attrs: String): String? {
        return when {
            attrs.contains("lemma.TR=") || attrs.contains("lemma.GNT=") -> "grc"
            attrs.contains("lemma.LXX=") -> "grc"
            attrs.contains("lemma.Strongs=") -> null // could be either
            else -> null
        }
    }

    /**
     * Parse <note> tag — footnote annotation.
     *
     * Attributes: type="crossReference" | "study" | "alternative" | "explanation"
     *             osisRef="Gen.1.1" (optional, for cross-reference notes)
     */
    private fun parseNoteTag(attrs: String, content: String): FootnoteInfo {
        val type = Regex("""type="([^"]*)"""").find(attrs)?.groupValues?.get(1)
        val osisRef = Regex("""osisRef="([^"]*)"""").find(attrs)?.groupValues?.get(1)
        return FootnoteInfo(
            type = type,
            text = decodeEntities(content.trim()),
            osisRef = osisRef
        )
    }

    /**
     * Parse <reference> or <scripRef> tag — cross-reference link.
     *
     * Attributes: osisRef="Isa.7.14"
     * Content: display text like "Isaiah 7:14"
     */
    private fun parseCrossRefTag(attrs: String, content: String): CrossRefInfo {
        val osisRef = Regex("""osisRef="([^"]*)"""").find(attrs)?.groupValues?.get(1) ?: ""
        return CrossRefInfo(
            osisRef = osisRef,
            text = decodeEntities(content.trim()).ifEmpty { null }
        )
    }

    // ─── Entity decoding ───

    /**
     * Decode XML character entities and numeric references.
     * Handles: &amp; &lt; &gt; &quot; &apos; &#NNNN;
     */
    private fun decodeEntities(text: String): String {
        return text
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&apos;", "'")
            .replace(Regex("&#(\\d+);")) { match ->
                match.groupValues[1].toIntOrNull()?.toChar()?.toString() ?: match.value
            }
            .replace(Regex("&#x([0-9a-fA-F]+);")) { match ->
                match.groupValues[1].toIntOrNull(16)?.toChar()?.toString() ?: match.value
            }
    }

    // ═══════════════════════════════════════════════════════════
    //  Utility
    // ═══════════════════════════════════════════════════════════

    private fun getVersification(book: Book): Versification {
        val name = book.bookMetaData.getProperty("Versification") ?: "KJV"
        return Versifications.instance().getVersification(name)
    }

    private fun resolveKey(v11n: Versification, reference: String): Key {
        return PassageKeyFactory.instance().getKey(v11n, reference)
    }
}

/**
 * Internal result from parseOsisLine.
 */
private data class VerseParseResult(
    val text: String,
    val words: List<WordInfo>,
    val footnotes: List<FootnoteInfo>,
    val crossRefs: List<CrossRefInfo>
)
