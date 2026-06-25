package com.bible.monolith.service

import com.bible.monolith.dto.*
import com.bible.monolith.model.ReadingPlanProgress
import com.bible.monolith.repository.ReadingPlanProgressRepository
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import jakarta.annotation.PostConstruct
import org.slf4j.LoggerFactory
import org.springframework.core.io.support.PathMatchingResourcePatternResolver
import org.springframework.stereotype.Service
import java.time.LocalDate

/**
 * 读经计划服务
 *
 * 功能：
 * - 加载 classpath:reading-plans 目录下的 JSON 预设计划
 * - 基于日期计算当天应读内容（全局统一计划，非登录用户共享）
 * - 登录用户打卡记录持久化到 H2
 * - 非登录用户前端 localStorage 自行管理
 */
@Service
class ReadingPlanService(
    private val progressRepo: ReadingPlanProgressRepository
) {
    private val logger = LoggerFactory.getLogger(ReadingPlanService::class.java)
    private val mapper = jacksonObjectMapper()

    /** 已加载的计划: planCode -> PlanData */
    private val plans = mutableMapOf<String, PlanData>()

    /** 计划列表缓存 */
    private var planListCache: List<ReadingPlanDto>? = null

    // ─── JSON schema classes ───
    data class PlanData(
        val planCode: String,
        val planName: String,
        val planNameZh: String = "",
        val planDescription: String,
        val planDescriptionZh: String = "",
        val numberOfDays: Int,
        val versification: String = "KJV",
        val dateBased: Boolean = true,
        val days: List<DayData>
    )

    data class DayData(
        val day: Int,
        val readings: List<String>
    )

    // ─── Init ───
    @PostConstruct
    fun loadPlans() {
        val resolver = PathMatchingResourcePatternResolver()
        val resources = resolver.getResources("classpath:reading-plans/*.json")  // Kotlin nested block comment: /* inside comments needs care
        for (res in resources) {
            try {
                res.inputStream.use { stream ->
                    val plan = mapper.readValue<PlanData>(stream)
                    plans[plan.planCode] = plan
                    logger.info("Loaded reading plan: ${plan.planCode} (${plan.planName}), ${plan.numberOfDays} days")
                }
            } catch (e: Exception) {
                logger.error("Failed to load reading plan from ${res.filename}", e)
            }
        }
        logger.info("Total reading plans loaded: ${plans.size}")
    }

    // ─── Public API ───

    /** 获取所有可用计划列表 */
    fun listPlans(): List<ReadingPlanDto> {
        planListCache?.let { return it }
        val list = plans.values.map { p ->
            ReadingPlanDto(
                planCode = p.planCode,
                planName = p.planName,
                planDescription = p.planDescription,
                numberOfDays = p.numberOfDays,
                versification = p.versification,
                dateBased = p.dateBased
            )
        }.sortedBy { it.planCode }
        planListCache = list
        return list
    }

    /** 获取计划详情（含中文名） */
    fun getPlanInfo(planCode: String): ReadingPlanDto? {
        val p = plans[planCode] ?: return null
        return ReadingPlanDto(
            planCode = p.planCode,
            planName = p.planName,
            planDescription = p.planDescription,
            numberOfDays = p.numberOfDays,
            versification = p.versification,
            dateBased = p.dateBased
        )
    }

    /**
     * 获取某天的阅读内容
     * @param planCode 计划代码
     * @param day 天数（1-based）
     * @return 当天阅读条目列表
     */
    fun getDayReading(planCode: String, day: Int): DayReadingDto? {
        val plan = plans[planCode] ?: return null
        if (day < 1 || day > plan.numberOfDays) return null

        val dayData = plan.days.find { it.day == day } ?: return null
        val readings = dayData.readings.map { refStr ->
            parseReadingRef(refStr)
        }
        return DayReadingDto(day = day, readings = readings)
    }

    /**
     * 获取基于日期的当天天数
     * 系统统一计划：以 1月1日 = Day 1 为起点
     * 对于 365 天计划：dayOfYear = day number
     * 对于 < 365 天计划：((dayOfYear - 1) % numberOfDays) + 1
     */
    fun getCurrentDay(planCode: String): Int {
        val plan = plans[planCode] ?: return 1
        val dayOfYear = LocalDate.now().dayOfYear
        if (plan.numberOfDays >= 365) {
            return minOf(dayOfYear, plan.numberOfDays)
        }
        return ((dayOfYear - 1) % plan.numberOfDays) + 1
    }

    /**
     * 获取某天的日期（1月1日 = Day 1）
     */
    fun getDateForDay(planCode: String, day: Int): String? {
        val plan = plans[planCode] ?: return null
        val startOfYear = LocalDate.of(LocalDate.now().year, 1, 1)
        val date = if (plan.numberOfDays >= 365) {
            startOfYear.plusDays((day - 1).toLong())
        } else {
            // For short plans, calculate the date within the current cycle
            val currentDay = getCurrentDay(planCode)
            val daysDiff = day - currentDay
            LocalDate.now().plusDays(daysDiff.toLong())
        }
        return date.toString()
    }

    /**
     * 获取整个计划的所有天阅读内容
     */
    fun getFullPlan(planCode: String): List<DayReadingDto>? {
        val plan = plans[planCode] ?: return null
        return plan.days.map { dayData ->
            DayReadingDto(
                day = dayData.day,
                readings = dayData.readings.map { parseReadingRef(it) }
            )
        }
    }

    // ─── Progress (login user) ───

    fun getProgress(userId: String, planCode: String): List<ProgressDto> {
        return progressRepo.findByUserIdAndPlanCode(userId, planCode).map { p ->
            ProgressDto(day = p.dayNumber, readCount = p.readCount, completed = p.completed)
        }
    }

    fun updateProgress(userId: String, planCode: String, day: Int, readCount: Int?, completed: Boolean?): ProgressDto {
        val existing = progressRepo.findByUserIdAndPlanCodeAndDayNumber(userId, planCode, day)
        if (existing != null) {
            readCount?.let { existing.readCount = it }
            completed?.let { existing.completed = it }
            progressRepo.save(existing)
            return ProgressDto(day = day, readCount = existing.readCount, completed = existing.completed)
        } else {
            val progress = ReadingPlanProgress(
                userId = userId,
                planCode = planCode,
                dayNumber = day,
                readCount = readCount ?: 0,
                completed = completed ?: false
            )
            progressRepo.save(progress)
            return ProgressDto(day = day, readCount = progress.readCount, completed = progress.completed)
        }
    }

    fun getPlanStatus(userId: String, planCode: String): PlanStatusDto {
        val plan = plans[planCode] ?: return PlanStatusDto(planCode, 0, 0, 0, emptyList())
        val progress = getProgress(userId, planCode)
        val currentDay = getCurrentDay(planCode)
        val completedDays = progress.count { it.completed }
        return PlanStatusDto(
            planCode = planCode,
            currentDay = currentDay,
            totalDays = plan.numberOfDays,
            completedDays = completedDays,
            progress = progress
        )
    }

    fun resetProgress(userId: String, planCode: String) {
        progressRepo.deleteByUserIdAndPlanCode(userId, planCode)
    }

    // ─── Helpers ───

    /** 解析经文引用字符串为 ReadingItemDto */
    private fun parseReadingRef(refStr: String): ReadingItemDto {
        // Format: "Gen 1", "Psa 119:1-32", "Gen 1-3"
        val parts = refStr.trim().split(Regex("\\s+"), limit = 2)
        val bookId = parts[0]
        val chapterPart = if (parts.size > 1) parts[1] else "1"

        // Check for verse range (e.g., "119:1-32")
        if (chapterPart.contains(":")) {
            val (chapter, verses) = chapterPart.split(":", limit = 2)
            val ch = chapter.toIntOrNull() ?: 1
            return ReadingItemDto(
                ref = refStr,
                bookId = bookId,
                chapterStart = ch,
                chapterEnd = ch,
                label = "$bookId $chapterPart"
            )
        }

        // Check for chapter range (e.g., "1-3")
        if (chapterPart.contains("-")) {
            val (start, end) = chapterPart.split("-", limit = 2)
            val chStart = start.toIntOrNull() ?: 1
            val chEnd = end.toIntOrNull() ?: chStart
            return ReadingItemDto(
                ref = refStr,
                bookId = bookId,
                chapterStart = chStart,
                chapterEnd = chEnd,
                label = refStr
            )
        }

        // Single chapter
        val ch = chapterPart.toIntOrNull() ?: 1
        return ReadingItemDto(
            ref = refStr,
            bookId = bookId,
            chapterStart = ch,
            chapterEnd = ch,
            label = refStr
        )
    }
}
