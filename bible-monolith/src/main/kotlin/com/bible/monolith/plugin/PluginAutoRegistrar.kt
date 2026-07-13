package com.bible.monolith.plugin

import org.slf4j.LoggerFactory
import org.springframework.boot.CommandLineRunner
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

/**
 * 启动时自动注册内置插件（幂等，仅首次创建）
 */
@Configuration
class PluginAutoRegistrar(
    private val pluginService: PluginService
) {
    private val log = LoggerFactory.getLogger(PluginAutoRegistrar::class.java)

    @Bean
    fun initPluginsRunner(): CommandLineRunner = CommandLineRunner {
        pluginService.ensureSeedPlugins()
        val plugins = pluginService.listActive()
        log.info("Plugins loaded: {} active", plugins.size)
        plugins.forEach { p ->
            log.info("  └─ {} ({}) → {}", p.code, p.nameZh, p.entryUrl)
        }
    }
}
