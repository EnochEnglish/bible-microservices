package com.bible.monolith.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

// ---- Auth Requests ----
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
    val password: String,

    val captchaToken: String? = null,
    val captchaAnswer: Int = 0
)

// ---- Admin Requests ----
data class CreateUserRequest(
    @field:NotBlank @field:Size(min = 2, max = 50)
    val username: String,

    @field:NotBlank @field:Size(min = 3, max = 100)
    val password: String,

    val role: String? = null  // defaults to USER if omitted
)

data class RoleUpdateRequest(
    @field:NotBlank
    val role: String
)

data class AdminResetPasswordRequest(
    @field:NotBlank @field:Size(min = 3, max = 100)
    val newPassword: String
)

// ---- Profile ----
data class UpdateProfileRequest(
    val displayName: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val age: Int? = null,
    val gender: String? = null,
    val country: String? = null,
    val city: String? = null
)

data class ChangePasswordRequest(
    @field:NotBlank
    val oldPassword: String,

    @field:NotBlank @field:Size(min = 3, max = 100)
    val newPassword: String
)

// ---- Password Recovery ----
data class ForgotPasswordRequest(
    @field:NotBlank
    val username: String
)

// ---- Responses ----
data class AuthResponse(
    val success: Boolean,
    val token: String? = null,
    val user: UserInfo? = null,
    val message: String? = null
)

data class UserInfo(
    val id: Long,
    val username: String,
    val role: String,
    val displayName: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val age: Int? = null,
    val gender: String? = null,
    val country: String? = null,
    val city: String? = null,
    val enabled: Boolean = true,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

data class UserListResponse(
    val success: Boolean,
    val users: List<UserInfo> = emptyList(),
    val message: String? = null
)
