package com.bible.monolith.plugin

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

/**
 * 插件管理 REST API
 * 
 * 公开端点：GET /api/v1/plugins — 获取启用的插件列表（前端菜单渲染用）
 * 管理端点：CRUD 插件（需 ADMIN 角色）
 */
@RestController
@RequestMapping("/api/v1/plugins")
class PluginController(
    private val pluginService: PluginService
) {

    /** 获取所有启用的插件（前端菜单渲染） */
    @GetMapping
    fun listActive(): List<Map<String, Any>> {
        return pluginService.listActive().map { it.toMap() }
    }

    /** 获取全部插件（含禁用，管理后台用） */
    @GetMapping("/all")
    fun listAll(): List<Map<String, Any>> {
        return pluginService.listAll().map { it.toMap() }
    }

    /** 创建插件（ADMIN） */
    @PostMapping
    fun create(@RequestBody body: CreatePluginRequest): ResponseEntity<Map<String, Any>> {
        val p = pluginService.create(
            code = body.code,
            nameZh = body.nameZh,
            nameEn = body.nameEn,
            icon = body.icon,
            description = body.description,
            entryUrl = body.entryUrl,
            apiPrefix = body.apiPrefix,
            sortOrder = body.sortOrder ?: 0,
            requiredRole = body.requiredRole ?: "USER",
            openInNewTab = body.openInNewTab ?: false
        )
        return ResponseEntity.ok(mapOf("ok" to true, "id" to p.id, "code" to p.code))
    }

    /** 更新插件（ADMIN） */
    @PutMapping("/{id}")
    fun update(@PathVariable id: Long, @RequestBody body: UpdatePluginRequest): ResponseEntity<Map<String, Any>> {
        val p = pluginService.update(
            id = id,
            nameZh = body.nameZh,
            nameEn = body.nameEn,
            icon = body.icon,
            description = body.description,
            entryUrl = body.entryUrl,
            apiPrefix = body.apiPrefix,
            sortOrder = body.sortOrder,
            requiredRole = body.requiredRole,
            openInNewTab = body.openInNewTab,
            isActive = body.isActive
        )
        return ResponseEntity.ok(mapOf("ok" to true, "id" to p.id))
    }

    /** 启用/禁用切换（ADMIN） */
    @PutMapping("/{id}/toggle")
    fun toggle(@PathVariable id: Long): ResponseEntity<Map<String, Any>> {
        val p = pluginService.toggle(id)
        return ResponseEntity.ok(mapOf("ok" to true, "id" to p.id, "isActive" to p.isActive))
    }

    /** 删除插件（软删除，ADMIN） */
    @DeleteMapping("/{id}")
    fun delete(@PathVariable id: Long): ResponseEntity<Map<String, Any>> {
        pluginService.delete(id)
        return ResponseEntity.ok(mapOf("ok" to true, "deleted" to id))
    }

    // ═══ 扩展函数 ═══

    private fun PluginModule.toMap(): Map<String, Any> = mapOf(
        "id" to id,
        "code" to code,
        "nameZh" to nameZh,
        "nameEn" to (nameEn ?: ""),
        "icon" to (icon ?: ""),
        "description" to (description ?: ""),
        "entryUrl" to entryUrl,
        "apiPrefix" to (apiPrefix ?: ""),
        "sortOrder" to sortOrder,
        "isActive" to isActive,
        "requiredRole" to requiredRole,
        "openInNewTab" to openInNewTab
    )
}

data class CreatePluginRequest(
    val code: String,
    val nameZh: String,
    val nameEn: String? = null,
    val icon: String? = null,
    val description: String? = null,
    val entryUrl: String,
    val apiPrefix: String? = null,
    val sortOrder: Int? = null,
    val requiredRole: String? = null,
    val openInNewTab: Boolean? = null
)

data class UpdatePluginRequest(
    val nameZh: String? = null,
    val nameEn: String? = null,
    val icon: String? = null,
    val description: String? = null,
    val entryUrl: String? = null,
    val apiPrefix: String? = null,
    val sortOrder: Int? = null,
    val requiredRole: String? = null,
    val openInNewTab: Boolean? = null,
    val isActive: Boolean? = null
)
