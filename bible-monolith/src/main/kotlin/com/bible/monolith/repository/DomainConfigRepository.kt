package com.bible.monolith.repository

import com.bible.monolith.model.DomainConfig
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface DomainConfigRepository : JpaRepository<DomainConfig, Long> {
    fun findByIsActiveTrueOrderBySortOrder(): List<DomainConfig>
    fun findByValue(value: String): DomainConfig?
    fun existsByValue(value: String): Boolean
}
