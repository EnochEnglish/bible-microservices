package com.bible.text.entity

import jakarta.persistence.*

/**
 * 圣经译本
 */
@Entity
@Table(name = "translations")
data class Translation(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(unique = true, nullable = false)
    val code: String,          // 如 "web", "kjv", "cuv"

    @Column(nullable = false)
    val name: String,           // 如 "World English Bible"

    @Column(nullable = false)
    val language: String,       // 如 "English", "Chinese"

    val abbreviation: String? = null,  // 缩写
    val description: String? = null,   // 描述

    @Column(nullable = false)
    val isActive: Boolean = true      // 是否启用
)