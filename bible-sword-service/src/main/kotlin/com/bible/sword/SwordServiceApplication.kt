package com.bible.sword

import com.bible.sword.support.StubIndexManager
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication
import org.springframework.cache.annotation.EnableCaching

/**
 * bible-sword-service - SWORD Module Native Reader
 *
 * Provides REST API for reading SWORD modules directly without pre-import.
 * Uses JSword (LGPL v2.1) as the SWORD reading engine.
 *
 * IMPORTANT: StubIndexManager must be installed before Spring starts,
 * because JSword's static initializer (Books.<clinit>) auto-discovers
 * drivers and requires an IndexManager to be available.
 *
 * @author bible-microservices team
 */
@SpringBootApplication
@EnableCaching
class SwordServiceApplication {
    // CORS configured in config/CorsConfig.kt
}

fun main(args: Array<String>) {
    // CRITICAL: Install stub before ANY JSword class is loaded
    StubIndexManager.install()
    runApplication<SwordServiceApplication>(*args)
}
