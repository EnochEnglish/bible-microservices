package com.bible.monolith.model

import jakarta.persistence.*

/**
 * 领域/学科配置 — 支持运行时增删改
 */
@Entity
@Table(name = "domain_config")
data class DomainConfig(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(nullable = false, unique = true, length = 50, name = "domain_value")
    val value: String,

    @Column(name = "label_zh", nullable = false, length = 100)
    val labelZh: String,

    @Column(name = "label_en", length = 100)
    val labelEn: String? = null,

    @Column(length = 10)
    val icon: String? = null,

    @Column(name = "sort_order", nullable = false)
    val sortOrder: Int = 0,

    @Column(name = "is_active", nullable = false)
    val isActive: Boolean = true
)
