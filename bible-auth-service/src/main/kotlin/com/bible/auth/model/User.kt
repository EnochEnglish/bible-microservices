package com.bible.auth.model

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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    val role: Role = Role.USER,

    @Column(nullable = false)
    val createdAt: Instant = Instant.now()
)

enum class Role {
    ADMIN, USER
}
