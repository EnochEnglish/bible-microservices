package com.bible.auth.controller

import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.security.SecureRandom
import java.time.Instant
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import java.util.Base64

data class CaptchaResponse(
    val success: Boolean = true,
    val question: String = "",
    val token: String = "",
    val message: String? = null
)

data class CaptchaVerifyRequest(
    val token: String,
    val answer: Int
)

@RestController
@RequestMapping("/api/v1/auth")
class CaptchaController {

    companion object {
        private const val HMAC_SECRET = "bible-captcha-secret-2026" // move to config in production
        private const val HMAC_ALG = "HmacSHA256"
        private const val TTL_SECONDS = 300L
    }

    @GetMapping("/captcha")
    fun getCaptcha(): ResponseEntity<CaptchaResponse> {
        val rng = SecureRandom()
        val a = rng.nextInt(10) + 1   // 1..10
        val b = rng.nextInt(10) + 1   // 1..10
        val op = if (rng.nextBoolean()) "+" else "×"
        val answer = if (op == "+") a + b else a * b
        val question = "$a $op $b = ?"
        val expiresAt = Instant.now().epochSecond + TTL_SECONDS

        val payload = "$a|$b|$op|$expiresAt"
        val sig = hmac(payload)
        val token = Base64.getUrlEncoder().encodeToString("$payload|$sig".toByteArray())

        return ResponseEntity.ok(CaptchaResponse(question = question, token = token))
    }

    fun verifyCaptcha(token: String, answer: Int): Boolean {
        return try {
            val decoded = String(Base64.getUrlDecoder().decode(token))
            val parts = decoded.split("|")
            if (parts.size != 5) return false
            val (aStr, bStr, op, expStr, sig) = parts
            val expiresAt = expStr.toLong()
            if (Instant.now().epochSecond > expiresAt) return false

            // Verify HMAC
            val payload = "$aStr|$bStr|$op|$expStr"
            val expectedSig = hmac(payload)
            if (sig != expectedSig) return false

            val a = aStr.toInt()
            val b = bStr.toInt()
            val expectedAnswer = if (op == "+") a + b else a * b
            answer == expectedAnswer
        } catch (e: Exception) {
            false
        }
    }

    private fun hmac(data: String): String {
        val mac = Mac.getInstance(HMAC_ALG)
        mac.init(SecretKeySpec(HMAC_SECRET.toByteArray(), HMAC_ALG))
        return Base64.getUrlEncoder().encodeToString(mac.doFinal(data.toByteArray()))
    }
}
