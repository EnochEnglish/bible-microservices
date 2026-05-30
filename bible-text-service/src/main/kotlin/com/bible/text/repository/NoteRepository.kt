package com.bible.text.repository

import com.bible.text.entity.Note
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface NoteRepository : JpaRepository<Note, Long> {

    fun findByVerseRefOrderByUpdatedAtDesc(verseRef: String): List<Note>

    fun findAllByOrderByUpdatedAtDesc(): List<Note>

    fun deleteByVerseRef(verseRef: String)
}