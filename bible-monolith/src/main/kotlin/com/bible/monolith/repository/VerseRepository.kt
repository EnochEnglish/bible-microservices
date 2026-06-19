package com.bible.monolith.repository

import com.bible.monolith.model.Book
import com.bible.monolith.model.Verse
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface VerseRepository : JpaRepository<Verse, Long> {
    fun findByBookAndChapterAndVerse(book: Book, chapter: Int, verse: Int): Verse?
    fun findByBookAndChapterOrderByVerse(book: Book, chapter: Int): List<Verse>
    fun findByBookAndChapterAndVerseBetween(book: Book, chapter: Int, verseStart: Int, verseEnd: Int): List<Verse>
    fun deleteByBook(book: Book)
    
    @Query("SELECT v FROM Verse v WHERE v.book.translation.id = :translationId ORDER BY RAND() LIMIT 1")
    fun findRandomByTranslation(@Param("translationId") translationId: Long): Verse?
    
    @Query("SELECT COUNT(v) FROM Verse v WHERE v.book.translation.id = :translationId")
    fun countByTranslation(@Param("translationId") translationId: Long): Long
}
