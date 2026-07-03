package com.bible.monolith.model

import jakarta.persistence.*
import java.time.Instant

/**
 * 课程结业证书
 */
@Entity
@Table(name = "course_certificates", indexes = [
    Index(name = "idx_cert_user", columnList = "user_id"),
    Index(name = "idx_cert_course", columnList = "course_id"),
    Index(name = "idx_cert_uk", columnList = "user_id,course_id", unique = true)
])
data class CourseCertificate(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(name = "course_id", nullable = false)
    val courseId: Long,

    /** 证书编号（唯一，可打印在证书上） */
    @Column(name = "certificate_code", unique = true, nullable = false, length = 50)
    val certificateCode: String,

    /** 最终成绩（百分比） */
    @Column(name = "final_score")
    val finalScore: Int? = null,

    /** 签发教师 */
    @Column(name = "issued_by")
    val issuedBy: Long? = null,

    @Column(name = "issued_at", nullable = false)
    val issuedAt: Instant = Instant.now(),

    @Column(name = "expires_at")
    val expiresAt: Instant? = null
)
