package com.bible.sword.controller

import com.bible.sword.dto.ModuleInfo
import com.bible.sword.service.BibleBookInfo
import com.bible.sword.service.SwordRegistry
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

/**
 * SWORD module management REST API.
 *
 * Endpoints:
 * - GET  /api/v1/sword/modules          — list all modules
 * - GET  /api/v1/sword/modules?category=BIBLE — filter by category
 * - GET  /api/v1/sword/modules/{initials} — module details
 * - GET  /api/v1/sword/modules/{initials}/books — books in a Bible module
 * - POST /api/v1/sword/reload           — reload modules
 */
@RestController
@RequestMapping("/api/v1/sword")
class ModuleController(
    private val swordRegistry: SwordRegistry
) {
    /**
     * List all installed SWORD modules.
     *
     * Optional query parameter:
     * - category: Filter by BookCategory (BIBLE, COMMENTARY, DICTIONARY, GENERAL_BOOK, MAPS)
     */
    @GetMapping("/modules")
    fun listModules(
        @RequestParam(required = false) category: String?
    ): ResponseEntity<ModuleListResponse> {
        val modules = swordRegistry.listModules(category)
        val byCategory = modules.groupBy { it.category }
        return ResponseEntity.ok(
            ModuleListResponse(
                total = modules.size,
                byCategory = byCategory.mapValues { it.value.size },
                modules = modules
            )
        )
    }

    /**
     * Get detailed info for a single module.
     */
    @GetMapping("/modules/{initials}")
    fun getModule(
        @PathVariable initials: String
    ): ResponseEntity<ModuleInfo> {
        val module = swordRegistry.getModule(initials)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(module)
    }

    /**
     * List all books in a Bible module (Genesis, Exodus, ...).
     */
    @GetMapping("/modules/{initials}/books")
    fun listBooks(
        @PathVariable initials: String
    ): ResponseEntity<BibleBooksResponse> {
        return try {
            val books = swordRegistry.listBooks(initials)
            ResponseEntity.ok(
                BibleBooksResponse(
                    module = initials,
                    bookCount = books.size,
                    books = books
                )
            )
        } catch (e: NoSuchElementException) {
            ResponseEntity.notFound().build()
        }
    }

    /**
     * Reload SWORD modules (after adding new ones to mods.d/).
     */
    @PostMapping("/reload")
    fun reloadModules(): ResponseEntity<ReloadResponse> {
        val count = swordRegistry.reloadModules()
        return ResponseEntity.ok(
            ReloadResponse(
                success = true,
                moduleCount = count,
                message = "Modules reloaded successfully"
            )
        )
    }
}

// ─── Response DTOs ───

data class ModuleListResponse(
    val total: Int,
    val byCategory: Map<String, Int>,
    val modules: List<ModuleInfo>
)

data class BibleBooksResponse(
    val module: String,
    val bookCount: Int,
    val books: List<BibleBookInfo>
)

data class ReloadResponse(
    val success: Boolean,
    val moduleCount: Int,
    val message: String
)
