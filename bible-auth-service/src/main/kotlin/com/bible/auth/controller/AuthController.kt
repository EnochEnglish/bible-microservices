package com.bible.auth.controller

import com.bible.auth.dto.AuthResponse
import com.bible.auth.dto.LoginRequest
import com.bible.auth.dto.RegisterRequest
import com.bible.auth.service.AuthService
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
        val resp = authService.register(req.username, req.password)
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
}
