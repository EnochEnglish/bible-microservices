package com.bible.monolith.controller

import com.bible.monolith.dto.*
import com.bible.monolith.service.AuthService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/auth")
class AuthController(
    private val authService: AuthService
) {
    @PostMapping("/register")
    fun register(@Valid @RequestBody req: RegisterRequest): ResponseEntity<AuthResponse> {
        val resp = authService.register(req.username, req.password, req.captchaToken, req.captchaAnswer)
        return if (resp.success) ResponseEntity.ok(resp)
        else ResponseEntity.badRequest().body(resp)
    }

    @PostMapping("/login")
    fun login(@Valid @RequestBody req: LoginRequest): ResponseEntity<AuthResponse> {
        val resp = authService.login(req.username, req.password)
        return if (resp.success) ResponseEntity.ok(resp)
        else ResponseEntity.status(401).body(resp)
    }

    @GetMapping("/me")
    fun me(auth: Authentication): ResponseEntity<AuthResponse> {
        val userId = auth.principal as Long
        val resp = authService.getCurrentUser(userId)
        return if (resp.success) ResponseEntity.ok(resp)
        else ResponseEntity.status(404).body(resp)
    }

    // ============ Profile ============

    @GetMapping("/profile")
    fun getProfile(auth: Authentication): ResponseEntity<AuthResponse> {
        val userId = auth.principal as Long
        val resp = authService.getCurrentUser(userId)
        return if (resp.success) ResponseEntity.ok(resp)
        else ResponseEntity.status(404).body(resp)
    }

    @PutMapping("/profile")
    fun updateProfile(
        auth: Authentication,
        @Valid @RequestBody req: UpdateProfileRequest
    ): ResponseEntity<AuthResponse> {
        val userId = auth.principal as Long
        val resp = authService.updateProfile(userId, req)
        return if (resp.success) ResponseEntity.ok(resp)
        else ResponseEntity.badRequest().body(resp)
    }

    // ============ Change Password ============

    @PostMapping("/change-password")
    fun changePassword(
        auth: Authentication,
        @Valid @RequestBody req: ChangePasswordRequest
    ): ResponseEntity<AuthResponse> {
        val userId = auth.principal as Long
        val resp = authService.changePassword(userId, req.oldPassword, req.newPassword)
        return if (resp.success) ResponseEntity.ok(resp)
        else ResponseEntity.badRequest().body(resp)
    }

    // ============ Forgot Password ============

    @PostMapping("/forgot-password")
    fun forgotPassword(@Valid @RequestBody req: ForgotPasswordRequest): ResponseEntity<AuthResponse> {
        val resp = authService.forgotPassword(req.username)
        return if (resp.success) ResponseEntity.ok(resp)
        else ResponseEntity.badRequest().body(resp)
    }
}
