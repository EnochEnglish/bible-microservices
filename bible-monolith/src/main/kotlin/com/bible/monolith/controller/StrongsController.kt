package com.bible.monolith.controller

import com.bible.monolith.service.StrongsService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

/**
 * Strong's 词典查询 API
 *
 * - GET  /api/v1/strongs/{id}              → 按编号查找（如 G25, H1254）
 * - GET  /api/v1/strongs/search?q=word     → 按词搜索
 * - GET  /api/v1/strongs/stats             → 统计信息
 */
@RestController
@RequestMapping("/api/v1/strongs")
class StrongsController(
    private val strongsService: StrongsService
) {

    /**
     * 按 Strong's 编号查找
     * URL: /api/v1/strongs/G25  or  /api/v1/strongs/H1254
     */
    @GetMapping("/{id}")
    fun lookup(@PathVariable id: String): ResponseEntity<Map<String, Any?>> {
        val entry = strongsService.lookupById(id)
        return if (entry != null) {
            ResponseEntity.ok(mapOf(
                "id" to id.uppercase(),
                "original_word" to entry.original_word,
                "transliteration" to entry.transliteration,
                "pronunciation" to entry.pronunciation,
                "definition" to entry.definition,
                "hebrew_words" to entry.hebrew_words
            ))
        } else {
            ResponseEntity.ok(mapOf(
                "id" to id,
                "error" to "not_found",
                "message" to "Strong's entry not found: $id"
            ))
        }
    }

    /**
     * 按词搜索词典
     * URL: /api/v1/strongs/search?q=love&lang=g
     */
    @GetMapping("/search")
    fun search(
        @RequestParam q: String,
        @RequestParam(required = false) lang: String?
    ): ResponseEntity<Map<String, Any>> {
        val result = strongsService.searchWord(q, lang)
        val matches = result.matches.map { ref ->
            mapOf(
                "id" to "${ref.prefix}${ref.number}",
                "prefix" to ref.prefix,
                "number" to ref.number,
                "original_word" to ref.entry.original_word,
                "transliteration" to ref.entry.transliteration,
                "pronunciation" to ref.entry.pronunciation,
                "definition" to ref.entry.definition,
                "hebrew_words" to ref.entry.hebrew_words
            )
        }
        return ResponseEntity.ok(mapOf(
            "query" to q,
            "count" to matches.size,
            "matches" to matches
        ))
    }

    /**
     * 统计信息
     */
    @GetMapping("/stats")
    fun stats(): ResponseEntity<Map<String, Any>> {
        return ResponseEntity.ok(strongsService.stats())
    }
}