package com.bible.monolith.plugin

import jakarta.persistence.*
import java.time.Instant

/**
 * 动态插件模块 — 运行时配置的功能扩展
 * 管理员通过后台 CRUD，前端 plugin-menu.js 自动渲染菜单项
 */
@Entity
@Table(name = "plugin_module", indexes = [
    Index(name = "idx_plugin_code", columnList = "code", unique = true),
    Index(name = "idx_plugin_active", columnList = "is_active")
])
data class PluginModule(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    /** 插件编码，唯一标识，如 'knowledge-base' */
    @Column(nullable = false, unique = true, length = 50)
    val code: String,

    /** 中文名称 */
    @Column(name = "name_zh", nullable = false, length = 100)
    val nameZh: String,

    /** 英文名称 */
    @Column(name = "name_en", length = 100)
    val nameEn: String? = null,

    /** emoji 图标 */
    @Column(length = 20)
    val icon: String? = null,

    /** 描述 */
    @Column(length = 500)
    val description: String? = null,

    /** 前端入口 URL，如 'plugins/knowledge-base/index.html' */
    @Column(name = "entry_url", nullable = false, length = 200)
    val entryUrl: String,

    /** 后端 API 前缀，如 '/api/v1/kb' */
    @Column(name = "api_prefix", length = 100)
    val apiPrefix: String? = null,

    /** 菜单排序 */
    @Column(name = "sort_order", nullable = false)
    val sortOrder: Int = 0,

    /** 是否启用 */
    @Column(name = "is_active", nullable = false)
    var isActive: Boolean = true,

    /** 所需角色：USER / TEACHER / ADMIN */
    @Column(name = "required_role", nullable = false, length = 20)
    val requiredRole: String = "USER",

    /** 是否在新标签打开 */
    @Column(name = "open_in_new_tab", nullable = false)
    val openInNewTab: Boolean = false,

    @Column(name = "created_at")
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at")
    var updatedAt: Instant = Instant.now()
)
