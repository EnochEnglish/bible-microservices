package com.bible.monolith.repository

import com.bible.monolith.model.Commentary
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface CommentaryRepository : JpaRepository<Commentary, Long> {

    /**
     * 查询某注释源中某节经文的注释
     */
    fun findBySourceAndBookIdAndChapterAndVerseStartLessThanEqualAndVerseEndGreaterThanEqual(
        source: String, bookId: String, chapter: Int, verse: Int, verse2: Int
    ): List<Commentary>

    /**
     * 查询某注释源中某章的注释（包括整章注释）
     */
    fun findBySourceAndBookIdAndChapter(
        source: String, bookId: String, chapter: Int
    ): List<Commentary>

    /**
     * 列出所有注释源
     */
    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT c.source, c.sourceName FROM Commentary c")
    fun findDistinctSources(): List<Array<Any>>

    fun existsBySourceAndBookIdAndChapterAndVerseStart(source: String, bookId: String, chapter: Int, verseStart: Int): Boolean
}