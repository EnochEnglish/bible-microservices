package com.bible.text.repository

import com.bible.text.entity.DictionaryEntry
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository

@Repository
interface DictionaryRepository : JpaRepository<DictionaryEntry, Long> {

    /**
     * 按来源列出所有词条
     */
    fun findBySourceOrderByEntryId(source: String): List<DictionaryEntry>

    /**
     * 按词条 key 精确查找
     */
    fun findBySourceAndEntryId(source: String, entryId: String): DictionaryEntry?

    /**
     * 全文搜索词条定义
     */
    @Query("SELECT d FROM DictionaryEntry d WHERE d.source = :source AND LOWER(d.definition) LIKE LOWER(CONCAT('%', :query, '%'))")
    fun searchBySourceAndText(source: String, query: String): List<DictionaryEntry>

    /**
     * 按词条 key 模糊搜索
     */
    @Query("SELECT d FROM DictionaryEntry d WHERE d.source = :source AND LOWER(d.entryId) LIKE LOWER(CONCAT('%', :query, '%'))")
    fun searchBySourceAndEntryId(source: String, query: String): List<DictionaryEntry>

    /**
     * 列出所有字典来源
     */
    @Query("SELECT DISTINCT d.source, d.sourceName FROM DictionaryEntry d ORDER BY d.source")
    fun findDistinctSources(): List<Array<Any>>

    fun existsBySourceAndEntryId(source: String, entryId: String): Boolean
}
