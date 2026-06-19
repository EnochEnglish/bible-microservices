package com.bible.monolith.controller

import com.bible.monolith.model.DictionaryEntry
import com.bible.monolith.repository.DictionaryRepository
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/dictionaries")
class DictionaryController(private val repo: DictionaryRepository) {

    /** 列出所有字典来源 */
    @GetMapping("/sources")
    fun listSources(): List<Map<String, String>> {
        return repo.findDistinctSources().map {
            mapOf("source" to (it[0] as String), "sourceName" to (it[1] as String))
        }
    }

    /** 按来源和词条key精确查找（大小写不敏感） */
    @GetMapping("/{source}/{entryId}")
    fun getEntry(@PathVariable source: String, @PathVariable entryId: String): DictionaryEntry? {
        // Try exact match first, then case-insensitive
        return repo.findBySourceAndEntryId(source, entryId)
            ?: repo.findBySourceAndEntryId(source, entryId.uppercase())
            ?: repo.findBySourceAndEntryId(source, entryId.lowercase())
    }

    /** 按来源列出所有词条 */
    @GetMapping("/{source}")
    fun listEntries(@PathVariable source: String): List<DictionaryEntry> {
        return repo.findBySourceOrderByEntryId(source)
    }

    /** 按来源搜索词条 */
    @GetMapping("/{source}/search")
    fun searchEntries(
        @PathVariable source: String,
        @RequestParam q: String
    ): List<DictionaryEntry> {
        return repo.searchBySourceAndText(source, q)
    }
}
