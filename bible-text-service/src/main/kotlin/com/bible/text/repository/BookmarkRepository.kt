package com.bible.text.repository

import com.bible.text.entity.Bookmark
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface BookmarkRepository : JpaRepository<Bookmark, Long> {

    /** List all bookmarks for a user */
    fun findByUserIdOrderByCreatedAtDesc(userId: String): List<Bookmark>

    /** Get bookmarks for a specific verse (user-scoped) */
    fun findByUserIdAndVerseRef(userId: String, verseRef: String): List<Bookmark>

    /** Batch check which verses are bookmarked (user-scoped) */
    fun findDistinctByUserIdAndVerseRefIn(userId: String, verseRefs: List<String>): List<Bookmark>

    /** Delete a bookmark by user and verseRef */
    fun deleteByUserIdAndVerseRef(userId: String, verseRef: String)

    /** Delete by id (must also match userId for safety) */
    fun deleteByIdAndUserId(id: Long, userId: String)
}
