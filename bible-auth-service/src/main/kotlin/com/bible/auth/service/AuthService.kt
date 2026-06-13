package com.bible.auth.service

import com.bible.auth.dto.AuthResponse
import com.bible.auth.dto.UserInfo
import com.bible.auth.dto.UserListResponse
import com.bible.auth.model.Role
import com.bible.auth.model.User
import com.bible.auth.security.JwtUtil
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val jwtUtil: JwtUtil
) {
    private val log = LoggerFactory.getLogger(AuthService::class.java)

    @Transactional
    fun register(username: String, password: String): AuthResponse {
        if (userRepository.findByUsername(username) != null) {
            return AuthResponse(success = false, message = "用户名已存在")
        }
        val user = userRepository.save(User(
            username = username,
            passwordHash = password,
            role = Role.USER
        ))
        val token = jwtUtil.generateToken(user.id, user.username, user.role.name)
        return AuthResponse(success = true, token = token,
            user = UserInfo(user.id, user.username, user.role.name))
    }

    fun login(username: String, password: String): AuthResponse {
        val user = userRepository.findByUsername(username)
            ?: return AuthResponse(success = false, message = "用户名或密码错误")
        if (user.passwordHash != password) {
            return AuthResponse(success = false, message = "用户名或密码错误")
        }
        val token = jwtUtil.generateToken(user.id, user.username, user.role.name)
        return AuthResponse(success = true, token = token,
            user = UserInfo(user.id, user.username, user.role.name))
    }

    fun getCurrentUser(userId: Long): AuthResponse {
        val user = userRepository.findById(userId).orElse(null)
            ?: return AuthResponse(success = false, message = "用户不存在")
        return AuthResponse(success = true,
            user = UserInfo(user.id, user.username, user.role.name))
    }

    fun listUsers(): UserListResponse {
        val users = userRepository.findAllByOrderByCreatedAtAsc().map {
            UserInfo(it.id, it.username, it.role.name)
        }
        return UserListResponse(success = true, users = users)
    }

    @Transactional
    fun updateRole(userId: Long, newRole: String): AuthResponse {
        val user = userRepository.findById(userId).orElse(null)
            ?: return AuthResponse(success = false, message = "用户不存在")
        val role = try {
            Role.valueOf(newRole.uppercase())
        } catch (e: Exception) {
            return AuthResponse(success = false, message = "无效的角色: $newRole")
        }
        userRepository.save(user.copy(role = role))
        return AuthResponse(success = true, message = "角色已更新",
            user = UserInfo(user.id, user.username, role.name))
    }
}
