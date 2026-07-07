package com.bible.monolith.controller

import com.bible.monolith.service.DomainConfigService
import org.springframework.web.bind.annotation.*
import com.bible.monolith.model.DomainConfig

/**
 * 系统设置 — 管理全局配置项（领域、组织类型、课程难度、角色等）
 */
@RestController
@RequestMapping("/api/v1/settings")
class SettingsController(
    private val domainConfigService: DomainConfigService
) {

    // ═══ 领域管理 (CRUD) ═══

    @GetMapping("/domains")
    fun getDomains(): List<Map<String, Any>> {
        return domainConfigService.listAll().map { d ->
            mapOf(
                "id" to d.id,
                "value" to d.value,
                "labelZh" to d.labelZh,
                "labelEn" to (d.labelEn ?: ""),
                "icon" to (d.icon ?: ""),
                "sortOrder" to d.sortOrder
            )
        }
    }

    @PostMapping("/domains")
    fun createDomain(
        @RequestHeader("Authorization") auth: String,
        @RequestBody body: CreateDomainRequest
    ): Map<String, Any> {
        val d = domainConfigService.create(body.value, body.labelZh, body.labelEn, body.icon)
        return mapOf("ok" to true, "id" to d.id, "value" to d.value)
    }

    @PutMapping("/domains/{id}")
    fun updateDomain(
        @RequestHeader("Authorization") auth: String,
        @PathVariable id: Long,
        @RequestBody body: UpdateDomainRequest
    ): Map<String, Any> {
        val d = domainConfigService.update(id, body.value, body.labelZh, body.labelEn, body.icon, body.isActive)
        return mapOf("ok" to true, "id" to d.id)
    }

    @DeleteMapping("/domains/{id}")
    fun deleteDomain(
        @RequestHeader("Authorization") auth: String,
        @PathVariable id: Long
    ): Map<String, Any> {
        domainConfigService.delete(id)
        return mapOf("ok" to true, "deleted" to id)
    }

    // ═══ 其他设置 (只读常量) ═══

    @GetMapping("/org-types")
    fun getOrgTypes(): List<Map<String, String>> = listOf(
        mapOf("value" to "community", "labelZh" to "社区", "labelEn" to "Community"),
        mapOf("value" to "seminary", "labelZh" to "神学院", "labelEn" to "Seminary"),
        mapOf("value" to "church", "labelZh" to "教会", "labelEn" to "Church"),
        mapOf("value" to "university", "labelZh" to "大学", "labelEn" to "University"),
        mapOf("value" to "training", "labelZh" to "培训机构", "labelEn" to "Training Institute"),
        mapOf("value" to "company", "labelZh" to "公司", "labelEn" to "Company")
    )

    @GetMapping("/difficulties")
    fun getDifficulties(): List<Map<String, String>> = listOf(
        mapOf("value" to "beginner", "labelZh" to "入门", "labelEn" to "Beginner"),
        mapOf("value" to "intermediate", "labelZh" to "中级", "labelEn" to "Intermediate"),
        mapOf("value" to "advanced", "labelZh" to "高级", "labelEn" to "Advanced")
    )

    @GetMapping("/org-roles")
    fun getOrgRoles(): List<Map<String, String>> = listOf(
        mapOf("value" to "OWNER", "labelZh" to "所有者", "labelEn" to "Owner", "level" to "100"),
        mapOf("value" to "ADMIN", "labelZh" to "管理员", "labelEn" to "Admin", "level" to "80"),
        mapOf("value" to "TEACHER", "labelZh" to "教师", "labelEn" to "Teacher", "level" to "60"),
        mapOf("value" to "LIBRARIAN", "labelZh" to "图书管理员", "labelEn" to "Librarian", "level" to "40"),
        mapOf("value" to "STUDENT", "labelZh" to "学生", "labelEn" to "Student", "level" to "20"),
        mapOf("value" to "MEMBER", "labelZh" to "成员", "labelEn" to "Member", "level" to "10")
    )

    @GetMapping("/system-roles")
    fun getSystemRoles(): List<Map<String, String>> = listOf(
        mapOf("value" to "ADMIN", "labelZh" to "系统管理员", "labelEn" to "System Admin"),
        mapOf("value" to "TEACHER", "labelZh" to "教师", "labelEn" to "Teacher"),
        mapOf("value" to "USER", "labelZh" to "普通用户", "labelEn" to "User")
    )

    @GetMapping("/info")
    fun getSystemInfo(): Map<String, Any> = mapOf(
        "name" to "Bible Study Platform",
        "nameZh" to "圣经学习平台",
        "version" to "20260707a",
        "features" to listOf(
            "bible-reading", "interlinear", "strongs", "commentary",
            "dictionary", "maps", "devotion", "reading-plan",
            "courses", "library", "organizations", "auth"
        )
    )
}

data class CreateDomainRequest(
    val value: String,
    val labelZh: String,
    val labelEn: String? = null,
    val icon: String? = null
)

data class UpdateDomainRequest(
    val value: String? = null,
    val labelZh: String? = null,
    val labelEn: String? = null,
    val icon: String? = null,
    val isActive: Boolean? = null
)
