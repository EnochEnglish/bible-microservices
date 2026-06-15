package com.bible.text.util

import com.fasterxml.jackson.databind.ObjectMapper

/**
 * Simple JWT utility — extracts userId from token without full validation.
 * Full signature validation is done by the Auth service; text service only reads the payload.
 */
object JwtUtil {

    private val mapper = ObjectMapper()

    /**
     * Extract userId ("sub" claim) from a JWT token string.
     * Token format: header.payload.signature (base64-encoded JSON)
     */
    fun extractUserId(token: String): String? {
        return try {
            val parts = token.split(".")
            if (parts.size < 2) return null
            val payload = String(java.util.Base64.getUrlDecoder().decode(parts[1]))
            val claims = mapper.readTree(payload)
            claims.get("sub")?.asText()
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Extract userId from Authorization header value.
     * Supports: "Bearer <token>" and "<token>" (raw)
     */
    fun userIdFromAuthHeader(authHeader: String?): String? {
        if (authHeader.isNullOrBlank()) return null
        val token = if (authHeader.startsWith("Bearer ", ignoreCase = true))
            authHeader.substring(7).trim()
        else
            authHeader.trim()
        if (token.isBlank()) return null
        return extractUserId(token)
    }
}
