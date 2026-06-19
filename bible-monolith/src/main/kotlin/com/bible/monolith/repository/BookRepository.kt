package com.bible.monolith.repository

import com.bible.monolith.model.Book
import com.bible.monolith.model.Translation
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface BookRepository : JpaRepository<Book, Long> {
    fun findByTranslationAndBookIdIgnoreCase(translation: Translation, bookId: String): Book?
    fun findByTranslationOrderByOrderIndex(translation: Translation): List<Book>
    fun findByTranslationCode(translationCode: String): List<Book>
    fun findByTranslation(translation: Translation): List<Book>
    fun deleteByTranslation(translation: Translation)
}
