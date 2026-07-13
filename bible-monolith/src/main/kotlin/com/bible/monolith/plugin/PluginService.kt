package com.bible.monolith.plugin

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

/**
 * 插件管理服务 — CRUD + 启动时自动注册内置插件
 */
@Service
class PluginService(
    private val repo: PluginModuleRepository
) {
    private val log = LoggerFactory.getLogger(PluginService::class.java)

    /** 获取所有启用的插件（前端菜单渲染用） */
    fun listActive(): List<PluginModule> = repo.findByIsActiveTrueOrderBySortOrder()

    /** 获取全部插件（管理后台用） */
    fun listAll(): List<PluginModule> = repo.findAll().sortedBy { it.sortOrder }

    fun getByCode(code: String): PluginModule? = repo.findByCode(code)

    @Transactional
    fun create(
        code: String, nameZh: String, nameEn: String?, icon: String?,
        description: String?, entryUrl: String, apiPrefix: String?,
        sortOrder: Int, requiredRole: String, openInNewTab: Boolean
    ): PluginModule {
        if (repo.existsByCode(code)) {
            throw IllegalArgumentException("Plugin code '$code' already exists")
        }
        val plugin = PluginModule(
            code = code, nameZh = nameZh, nameEn = nameEn, icon = icon,
            description = description, entryUrl = entryUrl, apiPrefix = apiPrefix,
            sortOrder = sortOrder, requiredRole = requiredRole, openInNewTab = openInNewTab
        )
        log.info("Created plugin: {} ({})", code, nameZh)
        return repo.save(plugin)
    }

    @Transactional
    fun update(
        id: Long, nameZh: String?, nameEn: String?, icon: String?,
        description: String?, entryUrl: String?, apiPrefix: String?,
        sortOrder: Int?, requiredRole: String?, openInNewTab: Boolean?, isActive: Boolean?
    ): PluginModule {
        val p = repo.findById(id).orElseThrow { IllegalArgumentException("Plugin not found: $id") }
        val updated = p.copy(
            nameZh = nameZh ?: p.nameZh,
            nameEn = nameEn ?: p.nameEn,
            icon = icon ?: p.icon,
            description = description ?: p.description,
            entryUrl = entryUrl ?: p.entryUrl,
            apiPrefix = apiPrefix ?: p.apiPrefix,
            sortOrder = sortOrder ?: p.sortOrder,
            requiredRole = requiredRole ?: p.requiredRole,
            openInNewTab = openInNewTab ?: p.openInNewTab,
            isActive = isActive ?: p.isActive,
            updatedAt = Instant.now()
        )
        return repo.save(updated)
    }

    @Transactional
    fun toggle(id: Long): PluginModule {
        val p = repo.findById(id).orElseThrow { IllegalArgumentException("Plugin not found: $id") }
        p.isActive = !p.isActive
        p.updatedAt = Instant.now()
        return repo.save(p)
    }

    @Transactional
    fun delete(id: Long) {
        val p = repo.findById(id).orElseThrow { IllegalArgumentException("Plugin not found: $id") }
        // 软删除：标记为禁用
        p.isActive = false
        p.updatedAt = Instant.now()
        repo.save(p)
        log.info("Deactivated plugin id={}", id)
    }

    /**
     * 启动时自动注册内置插件（幂等）
     */
    @Transactional
    fun ensureSeedPlugins() {
        if (!repo.existsByCode("knowledge-base")) {
            repo.save(PluginModule(
                code = "knowledge-base",
                nameZh = "知识库",
                nameEn = "Knowledge Base",
                icon = "📚",
                description = "基于向量数据库的语义搜索引擎，索引本地图书库",
                entryUrl = "plugins/knowledge-base/index.html",
                apiPrefix = "/api/v1/kb",
                sortOrder = 100,
                requiredRole = "USER",
                openInNewTab = false
            ))
            log.info("Seed plugin registered: knowledge-base")
        }
    }
}
