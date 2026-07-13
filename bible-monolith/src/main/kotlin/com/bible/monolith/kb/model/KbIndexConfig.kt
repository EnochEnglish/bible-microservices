package com.bible.monolith.kb.model

import jakarta.persistence.*

@Entity
@Table(name = "kb_index_config")
data class KbIndexConfig(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = 0,

    @Column(name = "config_key", nullable = false, unique = true, length = 50)
    var configKey: String = "",

    @Column(name = "config_value", length = 500)
    var configValue: String? = null,

    @Column(length = 200)
    var description: String? = null
)
