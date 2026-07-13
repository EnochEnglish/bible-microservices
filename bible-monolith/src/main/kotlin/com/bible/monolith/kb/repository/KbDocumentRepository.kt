package com.bible.monolith.kb.repository

import com.bible.monolith.kb.model.KbDocument
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface KbDocumentRepository : JpaRepository<KbDocument, Long> {

    fun findBySourceTypeAndSourceRefAndChunkIndex(
        sourceType: String, sourceRef: String, chunkIndex: Int
    ): KbDocument?

    fun findBySourceType(sourceType: String, pageable: Pageable): Page<KbDocument>

    fun findByModule(module: String, pageable: Pageable): Page<KbDocument>

    fun findByBookCode(bookCode: String, pageable: Pageable): Page<KbDocument>

    fun deleteBySourceTypeAndSourceRef(sourceType: String, sourceRef: String)

    @Query("SELECT d FROM KbDocument d WHERE d.sourceType = :type AND d.isIndexedTfidf = false")
    fun findUnindexedTfidf(@Param("type") sourceType: String, pageable: Pageable): Page<KbDocument>

    @Query("SELECT d FROM KbDocument d WHERE d.sourceType = :type AND d.isIndexedBgesmall = false")
    fun findUnindexedBgesmall(@Param("type") sourceType: String, pageable: Pageable): Page<KbDocument>

    @Query("SELECT d FROM KbDocument d WHERE d.sourceType = :type AND d.isIndexedBgebase = false")
    fun findUnindexedBgebase(@Param("type") sourceType: String, pageable: Pageable): Page<KbDocument>

    @Query("SELECT d.sourceType, COUNT(d) FROM KbDocument d GROUP BY d.sourceType")
    fun countBySourceType(): List<Array<Any>>

    @Query("""
        SELECT d.sourceType, 
               SUM(CASE WHEN d.isIndexedTfidf THEN 1 ELSE 0 END),
               SUM(CASE WHEN d.isIndexedBgesmall THEN 1 ELSE 0 END),
               SUM(CASE WHEN d.isIndexedBgebase THEN 1 ELSE 0 END),
               COUNT(d)
        FROM KbDocument d GROUP BY d.sourceType
    """)
    fun indexStats(): List<Array<Any>>
}
