package com.bible.monolith.kb.repository

import com.bible.monolith.kb.model.KbIndexConfig
import org.springframework.data.jpa.repository.JpaRepository

interface KbIndexConfigRepository : JpaRepository<KbIndexConfig, Long> {
    fun findByConfigKey(key: String): KbIndexConfig?
}
