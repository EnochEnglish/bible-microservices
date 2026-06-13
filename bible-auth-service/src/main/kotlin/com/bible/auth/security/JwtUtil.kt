package com.bible.auth.security

import io.jsonwebtoken.*
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.util.*
import javax.crypto.SecretKey

@Component
class JwtUtil(
    @Value("\${jwt.secret}") secret: String,
    @Value("\${jwt.expiration-ms}") private val expirationMs: Long
) {
    private val key: SecretKey = Keys.hmacShaKeyFor(secret.toByteArray())

    fun generateToken(userId: Long, username: String, role: String): String {
        return Jwts.builder()
            .subject(userId.toString())
            .claim("username", username)
            .claim("role", role)
            .issuedAt(Date())
            .expiration(Date(System.currentTimeMillis() + expirationMs))
            .signWith(key)
            .compact()
    }

    fun validateToken(token: String): Boolean {
        return try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token)
            true
        } catch (e: Exception) {
            false
        }
    }

    fun getUserId(token: String): Long {
        val claims = Jwts.parser().verifyWith(key).build()
            .parseSignedClaims(token).payload
        return claims.subject.toLong()
    }

    fun getRole(token: String): String {
        val claims = Jwts.parser().verifyWith(key).build()
            .parseSignedClaims(token).payload
        return claims["role"] as? String ?: "USER"
    }

    fun getUsername(token: String): String {
        val claims = Jwts.parser().verifyWith(key).build()
            .parseSignedClaims(token).payload
        return claims["username"] as? String ?: ""
    }
}
