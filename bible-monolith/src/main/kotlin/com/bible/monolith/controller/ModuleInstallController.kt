package com.bible.monolith.controller

import com.bible.monolith.dto.AvailableModule
import com.bible.monolith.dto.InstallResult
import com.bible.monolith.dto.RepositoryInfo
import com.bible.monolith.service.ModuleInstallService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

/**
 * Module Installation REST API.
 *
 * Endpoints:
 * - GET  /api/v1/sword/install/sources              — list repository sources
 * - GET  /api/v1/sword/install/available?source=...  — browse available modules
 * - GET  /api/v1/sword/install/categories            — module categories
 * - POST /api/v1/sword/install                       — install a module
 * - DELETE /api/v1/sword/modules/{initials}           — uninstall a module
 * - GET  /api/v1/sword/install/status                — install status
 */
@RestController
@RequestMapping("/api/v1/sword")
class ModuleInstallController(
    private val installService: ModuleInstallService
) {
    /**
     * List available repository sources (CrossWire etc.).
     */
    @GetMapping("/install/sources")
    fun listSources(): ResponseEntity<List<RepositoryInfo>> {
        return ResponseEntity.ok(installService.repositories)
    }

    /**
     * Browse available modules from a repository.
     *
     * Query params:
     * - source (default: "crosswire") — repository id
     * - category — filter by category (BIBLE, COMMENTARY, DICTIONARY, etc.)
     * - search — full-text search across name/description
     */
    @GetMapping("/install/available")
    fun listAvailable(
        @RequestParam(defaultValue = "crosswire") source: String,
        @RequestParam(required = false) category: String?,
        @RequestParam(required = false) search: String?
    ): ResponseEntity<AvailableModulesResponse> {
        val modules = installService.listAvailable(source, category, search)
        val byCategory = modules.groupBy { it.category }.mapValues { it.value.size }
        return ResponseEntity.ok(
            AvailableModulesResponse(
                source = source,
                total = modules.size,
                byCategory = byCategory,
                modules = modules
            )
        )
    }

    /**
     * List module categories for filtering.
     */
    @GetMapping("/install/categories")
    fun listCategories(): ResponseEntity<List<String>> {
        return ResponseEntity.ok(installService.moduleCategories())
    }

    /**
     * Install a module from a repository source.
     *
     * Request body:
     * {
     *   "source": "crosswire",
     *   "module": "ESV2011"
     * }
     */
    @PostMapping("/install")
    fun install(
        @RequestBody request: InstallRequest
    ): ResponseEntity<InstallResult> {
        val result = installService.install(
            repoId = request.source ?: "crosswire",
            moduleName = request.module
        )
        return if (result.success) ResponseEntity.ok(result)
        else ResponseEntity.badRequest().body(result)
    }

    /**
     * Uninstall (delete) a previously installed module.
     */
    @DeleteMapping("/modules/{initials}")
    fun uninstall(
        @PathVariable initials: String
    ): ResponseEntity<InstallResult> {
        val result = installService.uninstall(initials)
        return if (result.success) ResponseEntity.ok(result)
        else ResponseEntity.badRequest().body(result)
    }

    /**
     * Get install status.
     *
     * Query params:
     * - module (optional) — get status for specific module
     */
    @GetMapping("/install/status")
    fun status(
        @RequestParam(required = false) module: String?
    ): ResponseEntity<Any> {
        return ResponseEntity.ok(installService.installStatus(module))
    }
}

// ─── DTOs ───

data class AvailableModulesResponse(
    val source: String,
    val total: Int,
    val byCategory: Map<String, Int>,
    val modules: List<AvailableModule>
)

data class InstallRequest(
    val source: String? = "crosswire",
    val module: String
)
