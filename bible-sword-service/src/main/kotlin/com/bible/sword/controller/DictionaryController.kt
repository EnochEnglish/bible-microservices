package com.bible.sword.controller

import com.bible.sword.service.DictSearchResult
import com.bible.sword.service.DictionaryService
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/sword")
class DictionaryController(
    private val dictionaryService: DictionaryService
) {

    /**
     * Look up a dictionary entry by exact key.
     *
     * Example: GET /api/v1/sword/StrongsGreek/dict/G2424
     * Returns the raw dictionary entry content as plain text or HTML.
     */
    @GetMapping("/{module}/dict/{key}")
    fun lookup(
        @PathVariable module: String,
        @PathVariable key: String
    ): Map<String, Any?> {
        val content = dictionaryService.lookup(module, key)
        return if (content != null) {
            mapOf(
                "module" to module,
                "key" to key,
                "content" to content,
                "found" to true
            )
        } else {
            mapOf(
                "module" to module,
                "key" to key,
                "content" to null,
                "found" to false,
                "message" to "Entry not found: $key"
            )
        }
    }

    /**
     * Search dictionary entries by keyword.
     *
     * Example: GET /api/v1/sword/StrongsGreek/dict/search?q=love&limit=10
     */
    @GetMapping("/{module}/dict/search")
    fun search(
        @PathVariable module: String,
        @RequestParam("q") query: String,
        @RequestParam(defaultValue = "20") limit: Int
    ): Map<String, Any> {
        val results = dictionaryService.search(module, query, limit)
        return mapOf(
            "module" to module,
            "query" to query,
            "count" to results.size,
            "results" to results
        )
    }
}
