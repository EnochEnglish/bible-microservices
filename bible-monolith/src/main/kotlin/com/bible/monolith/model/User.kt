package com.bible.monolith.model

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "users")
data class User(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(unique = true, nullable = false, length = 50)
    val username: String,

    @Column(nullable = false)
    val passwordHash: String,

    @Column(length = 100)
    val displayName: String? = null,

    @Column(length = 200)
    val email: String? = null,

    @Column(length = 30)
    val phone: String? = null,

    @Column(length = 500)
    val address: String? = null,

    val age: Int? = null,

    @Column(length = 20)
    val gender: String? = null,

    @Column(length = 100)
    val country: String? = null,

    @Column(length = 100)
    val city: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    val role: Role = Role.USER,

    @Column(nullable = false)
    val enabled: Boolean = true,

    @Column(nullable = false)
    val createdAt: Instant = Instant.now(),

    val updatedAt: Instant? = null
)

enum class Role {
    ADMIN, USER
}
