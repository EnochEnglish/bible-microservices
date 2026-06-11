package com.bible.text.repository

import com.bible.text.entity.Bookmark
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface BookmarkRepository : JpaRepository<Bookmark, Long> {

    fun findByVerseRef(verseRef: String): List<Bookmark>

    fun findDistinctByVerseRefIn(verseRefs: List<String>): List<Bookmark>

    fun findAllByOrderByCreatedAtDesc(): List<Bookmark>

    fun deleteByVerseRef(verseRef: String)
}