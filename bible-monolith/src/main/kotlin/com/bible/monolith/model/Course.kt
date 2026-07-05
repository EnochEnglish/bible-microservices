package com.bible.monolith.model

import jakarta.persistence.*
import java.time.Instant

/**
 * 在线课程
 */
@Entity
@Table(name = "courses", indexes = [
    Index(name = "idx_course_category", columnList = "category"),
    Index(name = "idx_course_instructor", columnList = "instructor_id"),
    Index(name = "idx_course_status", columnList = "status")
])
data class Course(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(nullable = false, length = 200)
    val title: String,

    @Column(name = "title_en", length = 200)
    val titleEn: String? = null,

    @Column(columnDefinition = "TEXT")
    val description: String? = null,

    @Column(name = "description_en", columnDefinition = "TEXT")
    val descriptionEn: String? = null,

    /** 教师 User.id */
    @Column(name = "instructor_id", nullable = false)
    val instructorId: Long,

    @Column(length = 50)
    val category: String? = null,

    @Column(length = 10)
    val icon: String? = null,

    /** beginner / intermediate / advanced */
    @Column(length = 20)
    val difficulty: String? = "beginner",

    /** 预计学习时长（小时） */
    @Column(name = "estimated_hours")
    val estimatedHours: Int? = null,

    @Column(name = "cover_image", length = 500)
    val coverImage: String? = null,

    /** 价格（0=免费） */
    val price: Int = 0,

    @Column(length = 10)
    val currency: String = "CNY",

    /** draft / published / archived */
    @Column(nullable = false, length = 20)
    val status: String = "draft",

    /** 领域分类: theology / english / cs / university / ...  用于通用化 */
    @Column(nullable = false, length = 30, columnDefinition = "VARCHAR(30) DEFAULT 'theology'")
    val domain: String = "theology",

    /** 机构名称（可选） */
    @Column(name = "organization", length = 100)
    val organization: String? = null,

    /** 标签（逗号分隔，如 "门徒训练,基础,救恩"） */
    @Column(length = 500)
    val tags: String? = null,

    @Column(name = "enrollment_count")
    val enrollmentCount: Int = 0,

    val rating: Double? = null,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at", nullable = false)
    val updatedAt: Instant = Instant.now()
)
