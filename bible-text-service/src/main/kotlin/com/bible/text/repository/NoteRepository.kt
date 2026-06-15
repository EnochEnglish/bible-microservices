package com.bible.text.repository

import com.bible.text.entity.Note
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface NoteRepository : JpaRepository<Note, Long> {

    /** List all notes for a user */
    fun findByUserIdOrderByUpdatedAtDesc(userId: String): List<Note>

    /** Get notes for a specific verse (user-scoped) */
    fun findByUserIdAndVerseRefOrderByUpdatedAtDesc(userId: String, verseRef: String): List<Note>

    /** Delete notes by user and verseRef */
    fun deleteByUserIdAndVerseRef(userId: String, verseRef: String)

    /** Delete by id (user-scoped) */
    fun deleteByIdAndUserId(id: Long, userId: String)
}
