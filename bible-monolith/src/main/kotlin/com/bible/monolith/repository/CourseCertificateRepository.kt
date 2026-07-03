package com.bible.monolith.repository

import com.bible.monolith.model.CourseCertificate
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

@Repository
interface CourseCertificateRepository : JpaRepository<CourseCertificate, Long> {
    fun findByUserId(userId: Long): List<CourseCertificate>
    fun findByUserIdAndCourseId(userId: Long, courseId: Long): List<CourseCertificate>
    fun findByCertificateCode(certificateCode: String): Optional<CourseCertificate>
}
