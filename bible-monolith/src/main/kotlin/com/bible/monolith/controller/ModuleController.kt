package com.bible.monolith.controller

import com.bible.monolith.service.ModuleService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile

/**
 * 模块管理 API
 *
 * - GET  /api/v1/modules/available              → 列出可安装的译本源
 * - POST /api/v1/modules/import                  → 导入圣经数据文件
 * - POST /api/v1/modules/import-url               → 从 URL 导入
 * - GET  /api/v1/modules/installed                → 列出已安装的译本
 * - DELETE /api/v1/modules/{translation}          → 卸载译本
 */
@RestController
@RequestMapping("/api/v1/modules")
class ModuleController(
    private val moduleService: ModuleService
) {

    /**
     * 列出可安装的译本源（来自 open-bibles 项目）
     */
    @GetMapping("/available")
    fun listAvailable(): ResponseEntity<Any> {
        return ResponseEntity.ok(mapOf(
            "sources" to moduleService.listAvailableSources()
        ))
    }

    /**
     * 上传并导入圣经数据文件
     */
    @PostMapping("/import")
    fun importFile(
        @RequestParam file: MultipartFile,
        @RequestParam(defaultValue = "auto") format: String
    ): ResponseEntity<Any> {
        val content = String(file.bytes, Charsets.UTF_8)
        val result = moduleService.importData(content, format)
        return ResponseEntity.ok(result)
    }

    /**
     * 从 URL 下载并导入
     */
    @PostMapping("/import-url")
    fun importUrl(@RequestBody request: ImportUrlRequest): ResponseEntity<Any> {
        val result = moduleService.importFromUrl(request.url, request.format)
        return ResponseEntity.ok(result)
    }

    /**
     * 列出已安装译本
     */
    @GetMapping("/installed")
    fun listInstalled(): ResponseEntity<Any> {
        return ResponseEntity.ok(mapOf(
            "translations" to moduleService.listInstalled()
        ))
    }

    /**
     * 卸载译本
     */
    @DeleteMapping("/{translation}")
    fun uninstall(@PathVariable translation: String): ResponseEntity<Any> {
        moduleService.uninstall(translation)
        return ResponseEntity.ok(mapOf("message" to "已卸载: $translation"))
    }
}

data class ImportUrlRequest(
    val url: String,
    val format: String = "auto"
)