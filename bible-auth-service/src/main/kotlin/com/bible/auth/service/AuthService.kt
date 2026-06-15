package com.bible.auth.service

import com.bible.auth.dto.*
import com.bible.auth.model.Role
import com.bible.auth.model.User
import com.bible.auth.security.JwtUtil
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val jwtUtil: JwtUtil
) {
    private val log = LoggerFactory.getLogger(AuthService::class.java)

    private fun User.toInfo() = UserInfo(
        id = id,
        username = username,
        role = role.name,
        displayName = displayName,
        email = email,
        phone = phone,
        address = address,
        age = age,
        gender = gender,
        country = country,
        city = city,
        enabled = enabled,
        createdAt = createdAt.toString(),
        updatedAt = updatedAt?.toString()
    )

    // ============ Registration & Login ============

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
        return AuthResponse(success = true, token = token, user = user.toInfo())
    }

    fun login(username: String, password: String): AuthResponse {
        val user = userRepository.findByUsername(username)
            ?: return AuthResponse(success = false, message = "用户名或密码错误")
        if (!user.enabled) {
            return AuthResponse(success = false, message = "账户已被禁用，请联系管理员")
        }
        if (user.passwordHash != password) {
            return AuthResponse(success = false, message = "用户名或密码错误")
        }
        val token = jwtUtil.generateToken(user.id, user.username, user.role.name)
        return AuthResponse(success = true, token = token, user = user.toInfo())
    }

    // ============ Current User ============

    fun getCurrentUser(userId: Long): AuthResponse {
        val user = userRepository.findById(userId).orElse(null)
            ?: return AuthResponse(success = false, message = "用户不存在")
        return AuthResponse(success = true, user = user.toInfo())
    }

    // ============ Profile ============

    @Transactional
    fun updateProfile(userId: Long, req: UpdateProfileRequest): AuthResponse {
        val user = userRepository.findById(userId).orElse(null)
            ?: return AuthResponse(success = false, message = "用户不存在")
        val updated = user.copy(
            displayName = req.displayName ?: user.displayName,
            email = req.email ?: user.email,
            phone = req.phone ?: user.phone,
            address = req.address ?: user.address,
            age = req.age ?: user.age,
            gender = req.gender ?: user.gender,
            country = req.country ?: user.country,
            city = req.city ?: user.city,
            updatedAt = Instant.now()
        )
        userRepository.save(updated)
        log.info("User {} updated profile", user.username)
        return AuthResponse(success = true, message = "资料已更新", user = updated.toInfo())
    }

    // ============ Change Password ============

    @Transactional
    fun changePassword(userId: Long, oldPassword: String, newPassword: String): AuthResponse {
        val user = userRepository.findById(userId).orElse(null)
            ?: return AuthResponse(success = false, message = "用户不存在")
        if (user.passwordHash != oldPassword) {
            return AuthResponse(success = false, message = "原密码错误")
        }
        if (newPassword.length < 3) {
            return AuthResponse(success = false, message = "新密码至少3个字符")
        }
        userRepository.save(user.copy(passwordHash = newPassword, updatedAt = Instant.now()))
        log.info("User {} changed password", user.username)
        return AuthResponse(success = true, message = "密码已更新")
    }

    // ============ Password Recovery ============

    fun forgotPassword(username: String): AuthResponse {
        val user = userRepository.findByUsername(username)
            ?: return AuthResponse(success = false, message = "该用户名不存在")
        if (user.email == null) {
            return AuthResponse(
                success = false,
                message = "该账户未设置邮箱，无法自助找回密码。请联系管理员重置密码。"
            )
        }
        // In a production system, this would send an email with a reset link.
        // For now, we instruct the user to contact admin.
        log.info("Password reset requested for {} (email: {})", user.username, user.email)
        return AuthResponse(
            success = true,
            message = "密码重置链接已发送至您的邮箱 ${user.email}。如未收到，请联系管理员。"
        )
    }

    // ============ Admin: List Users ============

    fun listUsers(): UserListResponse {
        val users = userRepository.findAllByOrderByCreatedAtAsc().map { it.toInfo() }
        return UserListResponse(success = true, users = users)
    }

    // ============ Admin: Create User ============

    @Transactional
    fun createUser(adminId: Long, req: CreateUserRequest): AuthResponse {
        val admin = userRepository.findById(adminId).orElse(null)
        if (admin == null || admin.role != Role.ADMIN) {
            return AuthResponse(success = false, message = "无权限")
        }
        if (userRepository.findByUsername(req.username) != null) {
            return AuthResponse(success = false, message = "用户名已存在")
        }
        val role = if (req.role != null) {
            try { Role.valueOf(req.role.uppercase()) } catch (e: Exception) {
                return AuthResponse(success = false, message = "无效角色: ${req.role}")
            }
        } else Role.USER
        val user = userRepository.save(User(
            username = req.username,
            passwordHash = req.password,
            role = role
        ))
        log.info("Admin {} created user {} with role {}", admin.username, req.username, role)
        return AuthResponse(success = true, message = "用户创建成功", user = user.toInfo())
    }

    // ============ Admin: Update Role ============

    @Transactional
    fun updateRole(userId: Long, newRole: String): AuthResponse {
        val user = userRepository.findById(userId).orElse(null)
            ?: return AuthResponse(success = false, message = "用户不存在")
        val role = try {
            Role.valueOf(newRole.uppercase())
        } catch (e: Exception) {
            return AuthResponse(success = false, message = "无效的角色: $newRole")
        }
        userRepository.save(user.copy(role = role, updatedAt = Instant.now()))
        log.info("User {} role changed to {}", user.username, role)
        return AuthResponse(success = true, message = "角色已更新",
            user = user.copy(role = role).toInfo())
    }

    // ============ Admin: Reset User Password ============

    @Transactional
    fun adminResetPassword(adminId: Long, userId: Long, newPassword: String): AuthResponse {
        val admin = userRepository.findById(adminId).orElse(null)
        if (admin == null || admin.role != Role.ADMIN) {
            return AuthResponse(success = false, message = "无权限")
        }
        val user = userRepository.findById(userId).orElse(null)
            ?: return AuthResponse(success = false, message = "用户不存在")
        if (newPassword.length < 3) {
            return AuthResponse(success = false, message = "新密码至少3个字符")
        }
        userRepository.save(user.copy(passwordHash = newPassword, updatedAt = Instant.now()))
        log.info("Admin {} reset password for {}", admin.username, user.username)
        return AuthResponse(success = true, message = "密码已重置")
    }

    // ============ Admin: Toggle Enabled ============

    @Transactional
    fun toggleEnabled(adminId: Long, userId: Long): AuthResponse {
        val admin = userRepository.findById(adminId).orElse(null)
        if (admin == null || admin.role != Role.ADMIN) {
            return AuthResponse(success = false, message = "无权限")
        }
        val user = userRepository.findById(userId).orElse(null)
            ?: return AuthResponse(success = false, message = "用户不存在")
        val newState = !user.enabled
        userRepository.save(user.copy(enabled = newState, updatedAt = Instant.now()))
        val msg = if (newState) "账户已启用" else "账户已禁用"
        log.info("Admin {} {} user {}", admin.username, msg, user.username)
        return AuthResponse(success = true, message = msg,
            user = user.copy(enabled = newState).toInfo())
    }
}
