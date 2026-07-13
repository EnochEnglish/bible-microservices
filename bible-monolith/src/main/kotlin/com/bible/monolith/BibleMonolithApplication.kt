package com.bible.monolith

import com.bible.monolith.support.StubIndexManager
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.autoconfigure.domain.EntityScan
import org.springframework.boot.runApplication
import org.springframework.cache.annotation.EnableCaching
import org.springframework.data.jpa.repository.config.EnableJpaRepositories

/**
 * Bible Monolith - Unified Spring Boot Application
 *
 * Merges 6 microservices into a single JVM process:
 * - API Gateway (CORS config)
 * - bible-text-service: verse query, annotations, bookmarks, Strong's, dictionary
 * - bible-search-service: full-text search via Apache Lucene
 * - bible-module-service: module management, BibleParser import
 * - bible-auth-service: JWT authentication + admin management
 * - bible-sword-service: JSword SWORD modules + dictionary + GenBook + maps
 *
 * Single port: 8080
 * JVM params: -Xms48m -Xmx160m
 *
 * Knowledge Base (kb package): Zvec-backed semantic search across
 * Bible, commentaries, dictionaries, devotions, genbooks, and library.
 *
 * IMPORTANT: StubIndexManager must be installed before Spring starts,
 * because JSword's static initializer (Books.<clinit>) auto-discovers
 * drivers and requires an IndexManager to be available.
 */
@SpringBootApplication
@EnableCaching
@EntityScan(basePackages = ["com.bible.monolith.model", "com.bible.monolith.plugin", "com.bible.monolith.kb.model"])
@EnableJpaRepositories(basePackages = ["com.bible.monolith.repository", "com.bible.monolith.plugin", "com.bible.monolith.kb.repository"])
class BibleMonolithApplication {
    // CORS configured in config/CorsConfig.kt
    // Security configured in config/SecurityConfig.kt
    // SWORD configured in config/SwordConfig.kt
}

fun main(args: Array<String>) {
    // CRITICAL: Install stub before ANY JSword class is loaded
    StubIndexManager.install()
    runApplication<BibleMonolithApplication>(*args)
}
