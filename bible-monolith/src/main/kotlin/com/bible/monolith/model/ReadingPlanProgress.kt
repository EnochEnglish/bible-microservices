package com.bible.monolith.model

import jakarta.persistence.*
import java.time.Instant

/**
 * 读经计划打卡记录 — 用户绑定（登录用户存 DB，非登录用户前端 localStorage）
 */
@Entity
@Table(name = "reading_plan_progress", indexes = [
    Index(name = "idx_rpp_user_plan", columnList = "user_id, plan_code"),
    Index(name = "idx_rpp_plan_day", columnList = "plan_code, day_number")
])
data class ReadingPlanProgress(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,

    @Column(name = "user_id", nullable = false, length = 50)
    val userId: String,

    @Column(name = "plan_code", nullable = false, length = 30)
    val planCode: String,

    @Column(name = "day_number", nullable = false)
    val dayNumber: Int,

    /** 已读的条目数（0 = 未读，全部读完 = numReadings） */
    @Column(name = "read_count", nullable = false)
    var readCount: Int = 0,

    /** 是否完全完成当天阅读 */
    @Column(name = "completed", nullable = false)
    var completed: Boolean = false,

    @Column(name = "updated_at", nullable = false)
    val updatedAt: Instant = Instant.now()
)
