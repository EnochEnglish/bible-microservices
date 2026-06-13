package com.bible.auth.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class LoginRequest(
    @field:NotBlank @field:Size(min = 2, max = 50)
    val username: String,

    @field:NotBlank @field:Size(min = 3, max = 100)
    val password: String
)

data class RegisterRequest(
    @field:NotBlank @field:Size(min = 2, max = 50)
    val username: String,

    @field:NotBlank @field:Size(min = 3, max = 100)
    val password: String
)

data class AuthResponse(
    val success: Boolean,
    val token: String? = null,
    val user: UserInfo? = null,
    val message: String? = null
)

data class UserInfo(
    val id: Long,
    val username: String,
    val role: String
)

data class UserListResponse(
    val success: Boolean,
    val users: List<UserInfo> = emptyList(),
    val message: String? = null
)

data class RoleUpdateRequest(
    @field:NotBlank
    val role: String
)
