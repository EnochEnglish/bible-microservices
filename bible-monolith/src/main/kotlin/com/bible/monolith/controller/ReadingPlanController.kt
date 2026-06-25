package com.bible.monolith.controller

import com.bible.monolith.dto.*
import com.bible.monolith.service.ReadingPlanService
import com.bible.monolith.util.TokenUtil
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

/**
 * 读经计划 API
 *
 * 非登录用户：可查看计划和当天阅读内容，打卡存前端 localStorage
 * 登录用户：打卡持久化到后端 H2
 *
 * GET  /api/v1/reading-plans                      — 列出所有计划
 * GET  /api/v1/reading-plans/{planCode}           — 计划详情
 * GET  /api/v1/reading-plans/{planCode}/today     — 今日阅读内容
 * GET  /api/v1/reading-plans/{planCode}/day/{day}  — 指定天阅读内容
 * GET  /api/v1/reading-plans/{planCode}/full       — 整个计划所有天
 *
 * GET  /api/v1/reading-plans/{planCode}/progress   — [登录] 查看打卡进度
 * POST /api/v1/reading-plans/{planCode}/progress   — [登录] 更新打卡
 * DELETE /api/v1/reading-plans/{planCode}/progress — [登录] 重置进度
 */
@RestController
@RequestMapping("/api/v1/reading-plans")
class ReadingPlanController(
    private val readingPlanService: ReadingPlanService
) {

    /** 列出所有可用计划 */
    @GetMapping
    fun listPlans(): ResponseEntity<List<ReadingPlanDto>> {
        return ResponseEntity.ok(readingPlanService.listPlans())
    }

    /** 获取计划详情 */
    @GetMapping("/{planCode}")
    fun getPlanInfo(@PathVariable planCode: String): ResponseEntity<ReadingPlanDto> {
        val plan = readingPlanService.getPlanInfo(planCode)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(plan)
    }

    /** 获取今日阅读内容 */
    @GetMapping("/{planCode}/today")
    fun getTodayReading(@PathVariable planCode: String): ResponseEntity<Map<String, Any>> {
        val plan = readingPlanService.getPlanInfo(planCode)
            ?: return ResponseEntity.notFound().build()
        val day = readingPlanService.getCurrentDay(planCode)
        val reading = readingPlanService.getDayReading(planCode, day)
            ?: return ResponseEntity.notFound().build()
        val result: Map<String, Any> = mapOf(
            "planCode" to planCode,
            "planName" to plan.planName,
            "day" to day,
            "totalDays" to plan.numberOfDays,
            "date" to (readingPlanService.getDateForDay(planCode, day) ?: ""),
            "readings" to reading.readings
        )
        return ResponseEntity.ok(result)
    }

    /** 获取指定天的阅读内容 */
    @GetMapping("/{planCode}/day/{day}")
    fun getDayReading(
        @PathVariable planCode: String,
        @PathVariable day: Int
    ): ResponseEntity<DayReadingDto> {
        val reading = readingPlanService.getDayReading(planCode, day)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(reading)
    }

    /** 获取整个计划所有天的阅读内容 */
    @GetMapping("/{planCode}/full")
    fun getFullPlan(@PathVariable planCode: String): ResponseEntity<List<DayReadingDto>> {
        val fullPlan = readingPlanService.getFullPlan(planCode)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(fullPlan)
    }

    // ─── Progress endpoints (login required) ───

    /** 获取打卡进度 */
    @GetMapping("/{planCode}/progress")
    fun getProgress(
        @PathVariable planCode: String,
        request: HttpServletRequest
    ): ResponseEntity<PlanStatusDto> {
        val userId = TokenUtil.userIdFromAuthHeader(request.getHeader("Authorization"))
            ?: return ResponseEntity.status(401).build()
        return ResponseEntity.ok(readingPlanService.getPlanStatus(userId, planCode))
    }

    /** 更新打卡 */
    @PostMapping("/{planCode}/progress")
    fun updateProgress(
        @PathVariable planCode: String,
        @RequestBody body: ProgressUpdateDto,
        request: HttpServletRequest
    ): ResponseEntity<ProgressDto> {
        val userId = TokenUtil.userIdFromAuthHeader(request.getHeader("Authorization"))
            ?: return ResponseEntity.status(401).build()
        val result = readingPlanService.updateProgress(
            userId, planCode, body.day, body.readCount, body.completed
        )
        return ResponseEntity.ok(result)
    }

    /** 重置进度 */
    @DeleteMapping("/{planCode}/progress")
    fun resetProgress(
        @PathVariable planCode: String,
        request: HttpServletRequest
    ): ResponseEntity<Map<String, Boolean>> {
        val userId = TokenUtil.userIdFromAuthHeader(request.getHeader("Authorization"))
            ?: return ResponseEntity.status(401).build()
        readingPlanService.resetProgress(userId, planCode)
        return ResponseEntity.ok(mapOf("reset" to true))
    }
}
