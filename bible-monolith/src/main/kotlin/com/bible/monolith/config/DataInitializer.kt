package com.bible.monolith.config

import com.bible.monolith.model.Organization
import com.bible.monolith.model.Role
import com.bible.monolith.model.User
import com.bible.monolith.model.UserOrgMembership
import com.bible.monolith.repository.OrganizationRepository
import com.bible.monolith.repository.UserOrgMembershipRepository
import com.bible.monolith.repository.UserRepository
import com.bible.monolith.service.DomainConfigService
import org.slf4j.LoggerFactory
import org.springframework.boot.CommandLineRunner
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.transaction.annotation.Transactional

/**
 * 启动时初始化默认数据：培训部组织 + 校长账户
 */
@Configuration
class DataInitializer(
    private val userRepo: UserRepository,
    private val orgRepo: OrganizationRepository,
    private val membershipRepo: UserOrgMembershipRepository,
    private val domainConfigService: DomainConfigService
) {
    private val log = LoggerFactory.getLogger(DataInitializer::class.java)

    @Bean
    @Transactional
    fun initDataRunner(): CommandLineRunner = CommandLineRunner {
        // 0. 初始化领域配置种子数据
        domainConfigService.ensureSeedData()

        // 1. 创建"培训部"组织（如果不存在）
        var org = orgRepo.findAll().find { it.name == "培训部" || it.name == "Training Department" }
        if (org == null) {
            org = orgRepo.save(Organization(
                name = "培训部",
                nameEn = "Training Department",
                domain = "theology",
                type = "training",
                description = "默认培训部门，负责课程管理和教学事务",
                location = "系统默认",
                contactEmail = null,
                contactPhone = null
            ))
            log.info("Created default organization: 培训部 (id=${org.id})")
        }

        // 2. 创建"校长"用户（如果不存在）
        var principal = userRepo.findByUsername("principal")
        if (principal == null) {
            principal = userRepo.save(User(
                username = "principal",
                passwordHash = "principal123",
                role = Role.TEACHER,
                displayName = "校长",
                email = null
            ))
            log.info("Created principal user: principal (id=${principal.id})")
        }

        // 3. 将校长加入培训部，角色为 ADMIN
        val membership = membershipRepo.findByUserIdAndOrgId(principal.id, org.id)
        if (membership == null) {
            membershipRepo.save(UserOrgMembership(
                userId = principal.id,
                orgId = org.id,
                orgRole = "ADMIN",
                department = "管理部",
                title = "校长"
            ))
            log.info("Added principal to 培训部 as ADMIN")
        }

        // 4. 将 admin 也加入培训部
        val admin = userRepo.findByUsername("admin")
        if (admin != null) {
            val adminMembership = membershipRepo.findByUserIdAndOrgId(admin.id, org.id)
            if (adminMembership == null) {
                membershipRepo.save(UserOrgMembership(
                    userId = admin.id,
                    orgId = org.id,
                    orgRole = "OWNER",
                    department = "系统管理",
                    title = "系统管理员"
                ))
                log.info("Added admin to 培训部 as OWNER")
            }
        }
    }
}
