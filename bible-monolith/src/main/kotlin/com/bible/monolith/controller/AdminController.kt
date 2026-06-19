package com.bible.monolith.controller

import com.bible.monolith.dto.*
import com.bible.monolith.service.AuthService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/auth/admin")
class AdminController(
    private val authService: AuthService
) {
    @GetMapping("/users")
    fun listUsers(): ResponseEntity<UserListResponse> {
        return ResponseEntity.ok(authService.listUsers())
    }

    @PostMapping("/users")
    fun createUser(
        auth: Authentication,
        @Valid @RequestBody req: CreateUserRequest
    ): ResponseEntity<AuthResponse> {
        val adminId = auth.principal as Long
        val resp = authService.createUser(adminId, req)
        return if (resp.success) ResponseEntity.ok(resp)
        else ResponseEntity.badRequest().body(resp)
    }

    @PutMapping("/users/{id}/role")
    fun updateRole(
        @PathVariable id: Long,
        @Valid @RequestBody req: RoleUpdateRequest
    ): ResponseEntity<AuthResponse> {
        val resp = authService.updateRole(id, req.role)
        return if (resp.success) ResponseEntity.ok(resp)
        else ResponseEntity.badRequest().body(resp)
    }

    @PostMapping("/users/{id}/reset-password")
    fun resetPassword(
        auth: Authentication,
        @PathVariable id: Long,
        @Valid @RequestBody req: AdminResetPasswordRequest
    ): ResponseEntity<AuthResponse> {
        val adminId = auth.principal as Long
        val resp = authService.adminResetPassword(adminId, id, req.newPassword)
        return if (resp.success) ResponseEntity.ok(resp)
        else ResponseEntity.badRequest().body(resp)
    }

    @PostMapping("/users/{id}/toggle")
    fun toggleEnabled(
        auth: Authentication,
        @PathVariable id: Long
    ): ResponseEntity<AuthResponse> {
        val adminId = auth.principal as Long
        val resp = authService.toggleEnabled(adminId, id)
        return if (resp.success) ResponseEntity.ok(resp)
        else ResponseEntity.badRequest().body(resp)
    }
}
