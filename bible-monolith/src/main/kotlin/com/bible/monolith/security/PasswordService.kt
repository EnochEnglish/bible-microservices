package com.bible.monolith.security

import org.springframework.beans.factory.annotation.Value
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service

/**
 * 密码安全服务 —— 兼容明文和 BCrypt 两种模式
 *
 * - dev profile: bcryptEnabled=false，明文存储和比较（兼容现有数据）
 * - prod profile: bcryptEnabled=true，BCrypt 哈希存储和验证
 *
 * 密码迁移：用户在 prod 模式下登录时，
 * 如果密码是明文（不以 $2a$ 开头），验证成功后自动升级为 BCrypt 哈希。
 */
@Service
class PasswordService(
    @Value("\${app.bcrypt-enabled:false}") private val bcryptEnabled: Boolean
) {
    private val encoder = BCryptPasswordEncoder(10)

    /**
     * 对密码进行哈希
     * - bcryptEnabled=true: 返回 BCrypt 哈希
     * - bcryptEnabled=false: 返回明文（开发环境兼容）
     */
    fun hash(plainPassword: String): String {
        return if (bcryptEnabled) encoder.encode(plainPassword) else plainPassword
    }

    /**
     * 验证密码
     * - 如果存储的哈希以 $2a$ 开头，用 BCrypt 验证
     * - 否则明文比较（兼容旧数据）
     */
    fun matches(plainPassword: String, storedPassword: String): Boolean {
        return if (storedPassword.startsWith("\$2a\$") || storedPassword.startsWith("\$2b\$")) {
            encoder.matches(plainPassword, storedPassword)
        } else {
            plainPassword == storedPassword
        }
    }

    /**
     * 判断密码是否需要升级（明文 → BCrypt）
     */
    fun needsUpgrade(storedPassword: String): Boolean {
        return bcryptEnabled && !storedPassword.startsWith("\$2a\$") && !storedPassword.startsWith("\$2b\$")
    }
}
