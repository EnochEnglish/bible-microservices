package com.bible.sword.service

import org.crosswire.jsword.book.Book
import org.crosswire.jsword.book.DataPolice
import org.slf4j.LoggerFactory
import org.springframework.cache.annotation.Cacheable
import org.springframework.stereotype.Service

/**
 * Look up entries in SWORD dictionary/lexicon modules (StrongsGreek, StrongsHebrew).
 *
 * Dictionary keys are Strong's numbers: "G1", "G2424", "H430", etc.
 */
@Service
class DictionaryService(
    private val swordRegistry: SwordRegistry
) {
    private val logger = LoggerFactory.getLogger(DictionaryService::class.java)

    /**
     * Look up a dictionary entry by Strong's number.
     */
    @Cacheable("dictionary-lookup")
    fun lookup(module: String, key: String): String? {
        val book = swordRegistry.getBook(module)

        val category = book.bookCategory.name
        if (category != "DICTIONARY" && category != "DAILY_DEVOTIONAL") {
            throw IllegalArgumentException("'$module' is not a dictionary module (category=$category)")
        }

        return try {
            // Create a key from the module's key system
            val swordKey = book.getKey(key)
            if (swordKey != null) {
                val raw = book.getRawText(swordKey)
                if (!raw.isNullOrBlank()) raw.trim() else null
            } else {
                // Fallback: search through global key list
                val list = book.getGlobalKeyList()
                for (entry in list) {
                    if (entry.name.equals(key, ignoreCase = true)) {
                        val raw = book.getRawText(entry)
                        return if (!raw.isNullOrBlank()) raw.trim() else null
                    }
                }
                null
            }
        } catch (e: Exception) {
            logger.warn("Dictionary lookup failed: module={}, key={}: {}", module, key, e.message)
            null
        }
    }

    /**
     * Search for entries whose key or content matches the query.
     */
    fun search(module: String, query: String, limit: Int = 20): List<DictSearchResult> {
        val book = swordRegistry.getBook(module)
        val results = mutableListOf<DictSearchResult>()

        try {
            val keyList = book.getGlobalKeyList()
            var count = 0
            for (entry in keyList) {
                if (count >= limit) break
                val raw = book.getRawText(entry)
                if (raw != null && raw.contains(query, ignoreCase = true)) {
                    results.add(DictSearchResult(key = entry.name, content = raw.take(500)))
                    count++
                }
            }
        } catch (e: Exception) {
            logger.warn("Dictionary search failed: module={}, query={}: {}", module, query, e.message)
        }

        return results
    }
}

data class DictSearchResult(
    val key: String,
    val content: String
)
