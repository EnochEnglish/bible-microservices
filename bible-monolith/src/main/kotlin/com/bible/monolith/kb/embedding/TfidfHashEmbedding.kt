package com.bible.monolith.kb.embedding

import org.springframework.stereotype.Component
import java.security.MessageDigest
import kotlin.math.sqrt

/**
 * TF-IDF Hash embedding — local, zero-dependency, millisecond speed.
 *
 * Uses feature hashing (the "hashing trick") to map tokens to a fixed-dimension
 * vector. Supports both unigram (English words) and bigram (Chinese characters)
 * tokenization, plus a theology synonym expansion table.
 *
 * Not a semantic model — it doesn't understand that "祷告" ≈ "祈求".
 * The synonym table compensates for this. For true semantic search, use
 * BGE-small or BGE-base via RemoteSemanticEmbedding.
 */
@Component
class TfidfHashEmbedding(
    private val dim: Int = 256
) : EmbeddingProvider {

    override val modelId = "tfidf_${dim}"
    override val dimension = dim
    override val displayName = "TF-IDF Hash ${dim}d"
    override val requiresNodeService = false

    // Theology synonym expansion — compensates for lack of semantic understanding
    private val synonyms: Map<String, List<String>> = mapOf(
        "祷告" to listOf("祈求", "呼求", "恳求", "代求", "祈祷"),
        "爱" to listOf("agape", "圣爱", "慈爱", "仁爱", "爱心"),
        "信" to listOf("信心", "相信", "信靠", "信任", "faith"),
        "称义" to listOf("义", "算为义", "归算为义", "justification", "righteousness"),
        "挽回祭" to listOf("propitiation", "赎罪", "挽回", "hilasterion"),
        "团契" to listOf("koinonia", "相交", "交通", "fellowship"),
        "救恩" to listOf("拯救", "救赎", "salvation", "得救"),
        "罪" to listOf("sin", "过犯", "罪孽", "悖逆", "transgression"),
        "恩典" to listOf("grace", "恩惠", "恩宠", "charis"),
        "圣灵" to listOf("神的灵", "真理的灵", "保惠师", "Holy Spirit", "paraclete"),
        "教会" to listOf("church", "会众", "基督的身体", "ekklesia"),
        "洗礼" to listOf("baptism", "受洗", "浸礼", "baptizo"),
        "圣餐" to listOf("communion", "主的晚餐", "圣餐礼", "eucharist"),
        "复活" to listOf("resurrection", "复活节", "anastasis"),
        "创世" to listOf("creation", "创造", "创世记", "genesis"),
        "启示" to listOf("revelation", "启示录", "apocalypse", "apokalypsis"),
        "约" to listOf("covenant", "契约", "testament", "diatheke"),
        "献祭" to listOf("sacrifice", "祭物", "献祭", "thysia"),
        "律法" to listOf("law", "法律", "torah", "nomos"),
        "先知" to listOf("prophet", "预言", "propheteia", "nabi")
    )

    override fun isReady() = true

    override fun embed(text: String): FloatArray {
        val expanded = expandQuery(text)
        val tokens = tokenize(expanded)
        val vec = FloatArray(dim)

        for (token in tokens) {
            val hash = stableHash(token)
            val idx = (hash and 0x7FFFFFFF.toInt()) % dim
            val sign = if (((hash ushr 16) and 1) == 0) 1f else -1f
            // Bigrams get 2x weight (more specific), unigrams 1x
            val weight = if (token.length > 1) 2.0f else 1.0f
            vec[idx] += sign * weight
        }

        // L2 normalize
        val norm = sqrt(vec.fold(0f) { acc, v -> acc + v * v })
        if (norm > 0f) for (i in vec.indices) vec[i] /= norm

        return vec
    }

    override fun embedBatch(texts: List<String>): List<FloatArray> = texts.map { embed(it) }

    // ─── Tokenization ───

    private fun tokenize(text: String): List<String> {
        val tokens = mutableListOf<String>()

        // English / Latin: split on whitespace and punctuation
        val englishWords = text.split(Regex("[^a-zA-Z0-9]+"))
            .filter { it.isNotBlank() && it.length > 1 }
        tokens.addAll(englishWords)

        // Chinese bigrams: sliding window of 2 chars over CJK ranges
        val cjkChars = text.filter { ch ->
            ch.code in 0x4E00..0x9FFF ||   // CJK Unified
            ch.code in 0x3400..0x4DBF       // CJK Extension A
        }
        for (i in 0 until cjkChars.length - 1) {
            tokens.add(cjkChars.substring(i, i + 2))
        }

        // Also add individual CJK chars as unigrams (for single-char queries)
        for (ch in cjkChars) tokens.add(ch.toString())

        return tokens
    }

    // ─── Synonym expansion ───

    private fun expandQuery(text: String): String {
        var expanded = text
        synonyms.forEach { (key, syns) ->
            if (text.contains(key)) {
                expanded += " " + syns.joinToString(" ")
            }
        }
        return expanded
    }

    // ─── Stable hash (deterministic across JVM restarts) ───

    private fun stableHash(s: String): Int {
        val md = MessageDigest.getInstance("SHA-256")
        val bytes = md.digest(s.toByteArray(Charsets.UTF_8))
        var result = 0
        for (i in 0 until 4) {
            result = (result shl 8) or (bytes[i].toInt() and 0xFF)
        }
        return result
    }
}
