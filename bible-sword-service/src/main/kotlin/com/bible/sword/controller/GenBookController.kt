package com.bible.sword.controller

import com.bible.sword.dto.GenBookContentResponse
import com.bible.sword.dto.GenBookKeysResponse
import com.bible.sword.service.GenBookService
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/sword")
class GenBookController(
    private val genBookService: GenBookService
) {

    /**
     * List table-of-contents (keys) for a GenBook / General Book / Daily Devotion module.
     *
     * GET /api/v1/sword/genbook/{module}/keys?offset=0&limit=100
     */
    @GetMapping("/genbook/{module}/keys")
    fun listKeys(
        @PathVariable module: String,
        @RequestParam(defaultValue = "0") offset: Int,
        @RequestParam(defaultValue = "100") limit: Int
    ): Map<String, Any?> {
        val result = genBookService.listKeys(module, offset, limit)
        return if (result != null) {
            mapOf(
                "success" to true,
                "data" to result
            )
        } else {
            mapOf(
                "success" to false,
                "message" to "Module not found or not a General Book: $module"
            )
        }
    }

    /**
     * Read content of a specific key in a GenBook module.
     *
     * GET /api/v1/sword/genbook/{module}/content?key=OSIS_REF
     * Returns OSIS XML in the `content` field.
     */
    @GetMapping("/genbook/{module}/content")
    fun getContent(
        @PathVariable module: String,
        @RequestParam("key") keyRef: String
    ): Map<String, Any?> {
        val result = genBookService.getContent(module, keyRef)
        return if (result != null) {
            mapOf(
                "success" to true,
                "data" to result
            )
        } else {
            mapOf(
                "success" to false,
                "message" to "Module not found or not a General Book: $module"
            )
        }
    }
}
