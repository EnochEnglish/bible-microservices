package com.bible.monolith.model

import jakarta.persistence.*
import java.time.Instant

/**
 * 组织/机构 — 通用化的核心实体
 * 一个组织可以是：神学院、教会、大学、培训机构、社区图书馆等
 * 组织决定其下的课程领域、图书馆资源、人员角色
 */
@Entity
@Table(name = "organizations")
data class Organization(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(nullable = false, length = 100)
    val name: String,

    @Column(name = "name_en", length = 100)
    val nameEn: String? = null,

    @Column(nullable = false, length = 30)
    val domain: String = "theology",

    /** seminary / church / university / training / community / company */
    @Column(nullable = false, length = 20)
    val type: String = "community",

    @Column(length = 500)
    val description: String? = null,

    @Column(name = "logo_url", length = 500)
    val logoUrl: String? = null,

    @Column(length = 100)
    val location: String? = null,

    @Column(name = "contact_email", length = 200)
    val contactEmail: String? = null,

    @Column(name = "contact_phone", length = 30)
    val contactPhone: String? = null,

    @Column(nullable = false)
    val enabled: Boolean = true,

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now(),

    @Column(name = "updated_at")
    val updatedAt: Instant? = null
)

/**
 * 用户-组织关联 — 一个用户可属于多个组织，在不同组织有不同角色
 * orgRole: 在该组织内的角色 (OWNER / ADMIN / TEACHER / STUDENT / LIBRARIAN / MEMBER)
 */
@Entity
@Table(name = "user_org_memberships", uniqueConstraints = [
    UniqueConstraint(name = "uk_user_org", columnNames = ["user_id", "org_id"])
], indexes = [
    Index(name = "idx_membership_org", columnList = "org_id"),
    Index(name = "idx_membership_user", columnList = "user_id")
])
data class UserOrgMembership(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(name = "org_id", nullable = false)
    val orgId: Long,

    /** OWNER / ADMIN / TEACHER / STUDENT / LIBRARIAN / MEMBER */
    @Column(name = "org_role", nullable = false, length = 20)
    val orgRole: String = "MEMBER",

    /** 部门/组（如 "神学院-新约系"） */
    @Column(length = 100)
    val department: String? = null,

    /** 职称（如 "教授" / "讲师" / "学生"） */
    @Column(length = 100)
    val title: String? = null,

    @Column(name = "joined_at", nullable = false)
    val joinedAt: Instant = Instant.now(),

    @Column(nullable = false)
    val active: Boolean = true
)
