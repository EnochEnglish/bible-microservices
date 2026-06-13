package com.bible.auth.config

import com.bible.auth.model.Role
import com.bible.auth.model.User
import com.bible.auth.service.UserRepository
import jakarta.annotation.PostConstruct
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component

@Component
class DataInitializer(
    private val userRepository: UserRepository,
    @Value("\${app.admin.username}") private val adminUsername: String,
    @Value("\${app.admin.password}") private val adminPassword: String
) {
    private val log = LoggerFactory.getLogger(DataInitializer::class.java)

    @PostConstruct
    fun initAdmin() {
        if (userRepository.findByUsername(adminUsername) == null) {
            userRepository.save(User(
                username = adminUsername,
                passwordHash = adminPassword,
                role = Role.ADMIN
            ))
            log.info("Admin account created: $adminUsername")
        } else {
            log.info("Admin account already exists")
        }
    }
}
