package com.bible.monolith.controller

import com.bible.monolith.service.BibleSearchService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

/**
 * 搜索 API
 *
 * - GET  /api/v1/search?query=xxx&translation=web     → 全文搜索
 * - GET  /api/v1/search/suggest?query=xxx              → 搜索建议
 * - POST /api/v1/search/index/{translation}            → 建立索引
 */
@RestController
@RequestMapping("/api/v1/search")
class SearchController(
    private val searchService: BibleSearchService
) {

    /**
     * 全文搜索
     */
    @GetMapping
    fun search(
        @RequestParam query: String,
        @RequestParam(defaultValue = "web") translation: String,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int
    ): ResponseEntity<Any> {
        val result = searchService.search(query, translation, page, size)
        return ResponseEntity.ok(result)
    }

    /**
     * 搜索建议/自动补全
     */
    @GetMapping("/suggest")
    fun suggest(@RequestParam query: String): ResponseEntity<Any> {
        val suggestions = searchService.suggest(query)
        return ResponseEntity.ok(mapOf("suggestions" to suggestions))
    }

    /**
     * 为某译本建立搜索索引
     */
    @PostMapping("/index/{translation}")
    fun buildIndex(@PathVariable translation: String): ResponseEntity<Any> {
        searchService.buildIndex(translation)
        return ResponseEntity.ok(mapOf("message" to "索引构建已启动: $translation"))
    }
}