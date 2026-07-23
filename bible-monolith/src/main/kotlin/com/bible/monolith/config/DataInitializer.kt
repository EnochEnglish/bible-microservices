package com.bible.monolith.config

import com.bible.monolith.model.Organization
import com.bible.monolith.model.Role
import com.bible.monolith.model.User
import com.bible.monolith.model.UserOrgMembership
import com.bible.monolith.repository.OrganizationRepository
import com.bible.monolith.repository.UserOrgMembershipRepository
import com.bible.monolith.repository.UserRepository
import com.bible.monolith.security.PasswordService
import com.bible.monolith.service.DomainConfigService
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.CommandLineRunner
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.transaction.annotation.Transactional

/**
 * 启动时初始化默认数据：培训部组织 + 校长账户
 *
 * 密码来源：
 * - dev: application.yml 默认值 (admin123 / principal123)
 * - prod: 环境变量 ADMIN_PASSWORD / PRINCIPAL_PASSWORD
 */
@Configuration
class DataInitializer(
    private val userRepo: UserRepository,
    private val orgRepo: OrganizationRepository,
    private val membershipRepo: UserOrgMembershipRepository,
    private val domainConfigService: DomainConfigService,
    private val passwordService: PasswordService,
    @Value("\${app.admin.username}") private val adminUsername: String,
    @Value("\${app.admin.password}") private val adminPassword: String,
    @Value("\${app.principal.username}") private val principalUsername: String,
    @Value("\${app.principal.password}") private val principalPassword: String
) {
    private val log = LoggerFactory.getLogger(DataInitializer::class.java)

    @Bean
    @Transactional
    fun initDataRunner(): CommandLineRunner = CommandLineRunner {
        domainConfigService.ensureSeedData()

        // 1. 创建"培训部"组织
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

        // 2. 创建 admin 用户（如果不存在）
        val admin = userRepo.findByUsername(adminUsername)
        if (admin == null) {
            userRepo.save(User(
                username = adminUsername,
                passwordHash = passwordService.hash(adminPassword),
                role = Role.ADMIN,
                displayName = "系统管理员",
                email = null
            ))
            log.info("Created admin user: {}", adminUsername)
        }

        // 3. 创建 principal 用户（如果不存在）
        var principal = userRepo.findByUsername(principalUsername)
        if (principal == null) {
            principal = userRepo.save(User(
                username = principalUsername,
                passwordHash = passwordService.hash(principalPassword),
                role = Role.TEACHER,
                displayName = "校长",
                email = null
            ))
            log.info("Created principal user: {}", principalUsername)
        }

        // 4. 将校长加入培训部
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

        // 5. 将 admin 加入培训部
        val adminUser = userRepo.findByUsername(adminUsername)
        if (adminUser != null) {
            val adminMembership = membershipRepo.findByUserIdAndOrgId(adminUser.id, org.id)
            if (adminMembership == null) {
                membershipRepo.save(UserOrgMembership(
                    userId = adminUser.id,
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
