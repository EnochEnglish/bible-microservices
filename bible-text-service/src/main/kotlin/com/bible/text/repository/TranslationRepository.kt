package com.bible.text.repository

import com.bible.text.entity.Translation
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface TranslationRepository : JpaRepository<Translation, Long> {
    fun findByCode(code: String): Translation?
    fun findByIsActiveTrue(): List<Translation>
}
