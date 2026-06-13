package com.bible.auth.controller

import com.bible.auth.dto.AuthResponse
import com.bible.auth.dto.RoleUpdateRequest
import com.bible.auth.dto.UserListResponse
import com.bible.auth.service.AuthService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
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

    @PutMapping("/users/{id}/role")
    fun updateRole(
        @PathVariable id: Long,
        @Valid @RequestBody req: RoleUpdateRequest
    ): ResponseEntity<AuthResponse> {
        val resp = authService.updateRole(id, req.role)
        return if (resp.success) ResponseEntity.ok(resp)
        else ResponseEntity.badRequest().body(resp)
    }
}
