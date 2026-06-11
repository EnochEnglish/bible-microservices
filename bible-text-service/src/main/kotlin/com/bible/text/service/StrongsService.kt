package com.bible.text.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import jakarta.annotation.PostConstruct
import org.slf4j.LoggerFactory
import org.springframework.cache.annotation.Cacheable
import org.springframework.stereotype.Service
import java.io.File
import java.util.concurrent.ConcurrentHashMap

@Service
class StrongsService {
    private val logger = LoggerFactory.getLogger(StrongsService::class.java)
    private val mapper = ObjectMapper()

    private val greekMap = ConcurrentHashMap<Int, StrongsEntry>()
    private val hebrewMap = ConcurrentHashMap<Int, StrongsEntry>()

    // Word lookup index: lowercase text → Strong's refs
    private val wordIndex = ConcurrentHashMap<String, MutableList<StrongsRef>>()

    private val dataDir = System.getProperty("strongs.data.dir",
        "C:/Users/PC/.qclaw/workspace-v733kxt9elzfv7u1/bible-microservices/data/sword-dicts")

    private val greekPath = "$dataDir/strongs_greek.json"
    private val hebrewPath = "$dataDir/strongs_hebrew.json"
    private val hebrewWordsPath = "$dataDir/strongs_hebrew_words.json"

    @PostConstruct
    fun init() {
        loadGreek()
        loadHebrew()
        buildWordIndex()
    }

    private fun loadGreek() {
        try {
            val file = File(greekPath)
            if (!file.exists()) { logger.warn("Greek dict not found: $greekPath"); return }
            val entries: List<StrongsEntry> = mapper.readValue(file)
            entries.forEach { greekMap[it.strongs] = it }
            logger.info("Loaded ${greekMap.size} Greek Strong's entries")
        } catch (e: Exception) {
            logger.error("Failed to load Greek dictionary", e)
        }
    }

    private fun loadHebrew() {
        try {
            val file = File(hebrewPath)
            if (!file.exists()) { logger.warn("Hebrew dict not found: $hebrewPath"); return }
            val entries: List<StrongsEntry> = mapper.readValue(file)
            entries.forEach { hebrewMap[it.strongs] = it }
            logger.info("Loaded ${hebrewMap.size} Hebrew Strong's entries")
        } catch (e: Exception) {
            logger.error("Failed to load Hebrew dictionary", e)
        }

        // Load actual Hebrew word mappings from OSHB
        try {
            val wordsFile = File(hebrewWordsPath)
            if (!wordsFile.exists()) { logger.warn("Hebrew words not found: $hebrewWordsPath"); return }
            val wordsMap: Map<String, List<String>> = mapper.readValue(wordsFile)
            var merged = 0
            wordsMap.forEach { (sid, words) ->
                val num = sid.toIntOrNull() ?: return@forEach
                val entry = hebrewMap[num]
                if (entry != null) {
                    hebrewMap[num] = entry.copy(hebrew_words = words)
                    merged++
                }
            }
            logger.info("Merged Hebrew words into $merged Strong's entries")
        } catch (e: Exception) {
            logger.error("Failed to load Hebrew word mappings", e)
        }
    }

    private fun indexWord(word: String, ref: StrongsRef) {
        val w = word.lowercase().trim()
        if (w.isBlank() || w.length < 2) return
        wordIndex.getOrPut(w) { mutableListOf() }.add(ref)
    }

    private fun buildWordIndex() {
        greekMap.values.forEach { entry ->
            val ref = StrongsRef("G", entry.strongs, entry)
            entry.original_word?.let { indexWord(it, ref) }
            entry.transliteration?.let { indexWord(it, ref) }
            // Index significant definition words
            entry.definition?.let { def ->
                def.replace(Regex("[^a-zA-Z\\s]"), " ")
                    .split(Regex("\\s+"))
                    .filter { it.length >= 3 }
                    .forEach { indexWord(it, ref) }
            }
        }
        hebrewMap.values.forEach { entry ->
            val ref = StrongsRef("H", entry.strongs, entry)
            entry.original_word?.let { indexWord(it, ref) }
            entry.transliteration?.let { indexWord(it, ref) }
            entry.hebrew_words?.forEach { indexWord(it, ref) }
            entry.definition?.let { def ->
                def.replace(Regex("[^a-zA-Z\\s]"), " ")
                    .split(Regex("\\s+"))
                    .filter { it.length >= 3 }
                    .forEach { indexWord(it, ref) }
            }
        }
        logger.info("Built word index: ${wordIndex.size} unique words")
    }

    @Cacheable("strongs", key = "#prefix + #number")
    fun lookup(prefix: String, number: Int): StrongsEntry? {
        return when (prefix.uppercase()) {
            "G" -> greekMap[number]
            "H" -> hebrewMap[number]
            else -> greekMap[number] ?: hebrewMap[number]
        }
    }

    fun searchWord(query: String, language: String? = null): StrongsSearchResult {
        val q = query.lowercase().trim()
        val matches = mutableListOf<StrongsRef>()

        // Direct word match
        wordIndex[q]?.let { refs ->
            refs.forEach { ref ->
                if (language == null || language.equals(ref.prefix, ignoreCase = true)) {
                    matches.add(ref)
                }
            }
        }

        // Partial match: word contains query
        if (matches.size < 10) {
            wordIndex.forEach { (word, refs) ->
                if (word.contains(q)) {
                    refs.forEach { ref ->
                        if (language == null || language.equals(ref.prefix, ignoreCase = true)) {
                            matches.add(ref)
                        }
                    }
                }
            }
        }

        // Fuzzy: search definitions directly
        if (matches.isEmpty()) {
            val qRegex = Regex(q, RegexOption.IGNORE_CASE)
            if (language != null && language.equals("H", ignoreCase = true)) {
                hebrewMap.values.forEach { entry ->
                    if (entry.definition?.contains(qRegex) == true ||
                        entry.original_word?.contains(qRegex) == true) {
                        matches.add(StrongsRef("H", entry.strongs, entry))
                    }
                }
            } else {
                greekMap.values.forEach { entry ->
                    if (entry.definition?.contains(qRegex) == true ||
                        entry.original_word?.contains(qRegex) == true ||
                        entry.transliteration?.contains(qRegex) == true) {
                        matches.add(StrongsRef("G", entry.strongs, entry))
                    }
                }
                hebrewMap.values.forEach { entry ->
                    if (entry.definition?.contains(qRegex) == true ||
                        entry.original_word?.contains(qRegex) == true) {
                        matches.add(StrongsRef("H", entry.strongs, entry))
                    }
                }
            }
        }

        return StrongsSearchResult(
            query = query,
            matches = matches.distinctBy { "${it.prefix}${it.number}" }.take(50)
        )
    }

    fun lookupById(id: String): StrongsEntry? {
        val cleaned = id.trim().uppercase()
        val prefix = cleaned.takeWhile { it in "GH" }
        val number = cleaned.drop(prefix.length).toIntOrNull() ?: return null
        return lookup(prefix, number)
    }

    fun stats(): Map<String, Any> {
        return mapOf(
            "greek_count" to greekMap.size,
            "hebrew_count" to hebrewMap.size,
            "total" to greekMap.size + hebrewMap.size,
            "indexed_words" to wordIndex.size
        )
    }
}

data class StrongsEntry(
    val strongs: Int = 0,
    val original_word: String? = null,
    val transliteration: String? = null,
    val pronunciation: String? = null,
    val definition: String? = null,
    val hebrew_words: List<String>? = null  // actual Hebrew from OSHB
)

data class StrongsRef(
    val prefix: String,
    val number: Int,
    val entry: StrongsEntry
)

data class StrongsSearchResult(
    val query: String,
    val matches: List<StrongsRef>
)