package com.bible.monolith.controller

import org.springframework.web.bind.annotation.*

/**
 * 系统设置 — 管理全局配置项（领域、组织类型、课程难度、角色等）
 * 数据为内置常量，前端通过此 API 获取下拉选项
 */
@RestController
@RequestMapping("/api/v1/settings")
class SettingsController {

    /** 领域/学科分类 */
    @GetMapping("/domains")
    fun getDomains(): List<Map<String, String>> = listOf(
        mapOf("value" to "theology", "labelZh" to "神学", "labelEn" to "Theology", "icon" to "✝️"),
        mapOf("value" to "english", "labelZh" to "英语", "labelEn" to "English", "icon" to "📖"),
        mapOf("value" to "cs", "labelZh" to "计算机", "labelEn" to "Computer Science", "icon" to "💻"),
        mapOf("value" to "university", "labelZh" to "大学", "labelEn" to "University", "icon" to "🎓")
    )

    /** 组织类型 */
    @GetMapping("/org-types")
    fun getOrgTypes(): List<Map<String, String>> = listOf(
        mapOf("value" to "community", "labelZh" to "社区", "labelEn" to "Community"),
        mapOf("value" to "seminary", "labelZh" to "神学院", "labelEn" to "Seminary"),
        mapOf("value" to "church", "labelZh" to "教会", "labelEn" to "Church"),
        mapOf("value" to "university", "labelZh" to "大学", "labelEn" to "University"),
        mapOf("value" to "training", "labelZh" to "培训机构", "labelEn" to "Training Institute"),
        mapOf("value" to "company", "labelZh" to "公司", "labelEn" to "Company")
    )

    /** 课程难度 */
    @GetMapping("/difficulties")
    fun getDifficulties(): List<Map<String, String>> = listOf(
        mapOf("value" to "beginner", "labelZh" to "入门", "labelEn" to "Beginner"),
        mapOf("value" to "intermediate", "labelZh" to "中级", "labelEn" to "Intermediate"),
        mapOf("value" to "advanced", "labelZh" to "高级", "labelEn" to "Advanced")
    )

    /** 组织内角色 */
    @GetMapping("/org-roles")
    fun getOrgRoles(): List<Map<String, String>> = listOf(
        mapOf("value" to "OWNER", "labelZh" to "所有者", "labelEn" to "Owner", "level" to "100"),
        mapOf("value" to "ADMIN", "labelZh" to "管理员", "labelEn" to "Admin", "level" to "80"),
        mapOf("value" to "TEACHER", "labelZh" to "教师", "labelEn" to "Teacher", "level" to "60"),
        mapOf("value" to "LIBRARIAN", "labelZh" to "图书管理员", "labelEn" to "Librarian", "level" to "40"),
        mapOf("value" to "STUDENT", "labelZh" to "学生", "labelEn" to "Student", "level" to "20"),
        mapOf("value" to "MEMBER", "labelZh" to "成员", "labelEn" to "Member", "level" to "10")
    )

    /** 系统级角色 */
    @GetMapping("/system-roles")
    fun getSystemRoles(): List<Map<String, String>> = listOf(
        mapOf("value" to "ADMIN", "labelZh" to "系统管理员", "labelEn" to "System Admin"),
        mapOf("value" to "TEACHER", "labelZh" to "教师", "labelEn" to "Teacher"),
        mapOf("value" to "USER", "labelZh" to "普通用户", "labelEn" to "User")
    )

    /** 系统信息 */
    @GetMapping("/info")
    fun getSystemInfo(): Map<String, Any> = mapOf(
        "name" to "Bible Study Platform",
        "nameZh" to "圣经学习平台",
        "version" to "20260705c",
        "features" to listOf(
            "bible-reading", "interlinear", "strongs", "commentary",
            "dictionary", "maps", "devotion", "reading-plan",
            "courses", "library", "organizations", "auth"
        )
    )
}
