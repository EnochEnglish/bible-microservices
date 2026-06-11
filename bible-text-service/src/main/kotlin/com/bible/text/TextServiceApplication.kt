package com.bible.text

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.cache.annotation.EnableCaching

/**
 * bible-text-service 启动类
 *
 * 经文查询微服务，核心职责：
 * - 经文查询（单节、范围、整章）
 * - 译本管理（多译本切换）
 * - 经文缓存（按译本+书卷+章缓存）
 *
 * API 风格参考 bible-api.com：
 * - GET /api/v1/bible/{translation}/{book}/{chapter}
 * - GET /api/v1/bible/{translation}/{book}/{chapter}/{verse}
 * - GET /api/v1/bible/{translation}/books
 * - GET /api/v1/bible/translations
 */
@SpringBootApplication
@EnableCaching
class TextServiceApplication

fun main(args: Array<String>) {
    runApplication<TextServiceApplication>(*args)
}