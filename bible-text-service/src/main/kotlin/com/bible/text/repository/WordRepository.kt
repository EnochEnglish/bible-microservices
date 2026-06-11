package com.bible.text.repository

import com.bible.text.entity.Word
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface WordRepository : JpaRepository<Word, Long> {
    /** 获取某节经文的所有逐词标注，按位置排序 */
    fun findByVerseIdOrderByPosition(verseId: Long): List<Word>

    /** 批量获取多节经文的逐词标注 */
    fun findByVerseIdInOrderByPosition(verseIds: List<Long>): List<Word>

    /** 删除某节的所有标注（重新导入用） */
    fun deleteByVerseId(verseId: Long)
}
