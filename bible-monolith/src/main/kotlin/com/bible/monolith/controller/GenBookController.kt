package com.bible.monolith.controller

import com.bible.monolith.dto.GenBookContentResponse
import com.bible.monolith.dto.GenBookKeysResponse
import com.bible.monolith.service.GenBookService
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.io.File

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

    /**
     * Get map image for a MAPS module entry.
     *
     * GET /api/v1/sword/genbook/{module}/image?key=N
     * Returns the image binary with appropriate Content-Type.
     */
    @GetMapping("/genbook/{module}/image")
    fun getMapImage(
        @PathVariable module: String,
        @RequestParam("key") keyRef: String
    ): ResponseEntity<Any> {
        val (file, mime) = genBookService.getMapImageFile(module, keyRef)
            ?: return ResponseEntity.notFound().build<Any>()

        val bytes = file.readBytes()
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_TYPE, mime)
            .header(HttpHeaders.CACHE_CONTROL, "max-age=86400")
            .contentLength(bytes.size.toLong())
            .body(bytes)
    }
}
