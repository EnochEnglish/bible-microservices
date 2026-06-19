package com.bible.monolith.dto

/**
 * Strong's word-level data extracted from <w> tag (ThML <sync type="Strongs"> equivalent).
 */
data class WordInfo(
    val text: String,               // surface text (e.g., "beginning", "耶稣")
    val strongs: String? = null,    // e.g., "G746" or "H7225"
    val lemma: String? = null,      // original language lemma (e.g., "ιησου", "בראשית")
                                    // cleaned from raw "lemma.TR:ιησου" / "strong:H7225"
    val morph: String? = null,      // morphology code (e.g., "N-NSF", "V-AAM-2S")
    val foreignLang: String? = null,// language of <foreign>/lemma (e.g., "grc", "hbo", "la")
    val src: String? = null         // word order index from <w src="N">
)

/**
 * Footnote extracted from <note> tag.
 */
data class FootnoteInfo(
    val type: String? = null,       // "crossReference", "study", "alternative", "explanation"
    val text: String,               // footnote body text
    val osisRef: String? = null     // target reference if note is cross-reference type
)

/**
 * Cross-reference extracted from <reference> or <scripRef> tags.
 */
data class CrossRefInfo(
    val osisRef: String,            // target reference (e.g., "Isa.7.14")
    val text: String?,              // display text of the reference
    val type: String? = null        // optional type discriminator
)

/**
 * Single verse with word-level Strong's data and annotations.
 */
data class VerseInfo(
    val osisId: String,             // e.g., "Gen.1.1"
    val bookName: String? = null,   // e.g., "Genesis"
    val chapter: Int,
    val verse: Int,
    val text: String,               // plain display text (XML entities decoded, markup removed)
    val words: List<WordInfo>? = null,      // interlinear word data (module has Strong's)
    val footnotes: List<FootnoteInfo>? = null,  // inline <note> annotations
    val crossRefs: List<CrossRefInfo>? = null   // inline <reference>/<scripRef> links
)

/**
 * Response for passage queries (chapter or range).
 */
data class PassageResponse(
    val module: String,
    val reference: String,          // original query reference
    val versification: String? = null,
    val verseCount: Int,
    val verses: List<VerseInfo>
)
