package com.bible.monolith.plugin

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface PluginModuleRepository : JpaRepository<PluginModule, Long> {
    fun findByIsActiveTrueOrderBySortOrder(): List<PluginModule>
    fun findByCode(code: String): PluginModule?
    fun existsByCode(code: String): Boolean
}
