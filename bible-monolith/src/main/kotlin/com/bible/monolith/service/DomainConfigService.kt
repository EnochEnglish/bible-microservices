package com.bible.monolith.service

import com.bible.monolith.model.DomainConfig
import com.bible.monolith.repository.DomainConfigRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class DomainConfigService(
    private val domainRepo: DomainConfigRepository
) {
    fun listAll(): List<DomainConfig> {
        return domainRepo.findByIsActiveTrueOrderBySortOrder()
    }

    @Transactional
    fun create(value: String, labelZh: String, labelEn: String?, icon: String?): DomainConfig {
        if (domainRepo.existsByValue(value)) {
            throw IllegalArgumentException("Domain value '$value' already exists")
        }
        val maxOrder = (domainRepo.findByIsActiveTrueOrderBySortOrder().maxOfOrNull { it.sortOrder } ?: 0)
        return domainRepo.save(DomainConfig(
            value = value,
            labelZh = labelZh,
            labelEn = labelEn,
            icon = icon,
            sortOrder = maxOrder + 1
        ))
    }

    @Transactional
    fun update(id: Long, value: String?, labelZh: String?, labelEn: String?, icon: String?, isActive: Boolean?): DomainConfig {
        val domain = domainRepo.findById(id).orElseThrow { IllegalArgumentException("Domain not found: $id") }
        // Use a copy because data class is immutable-ish; JPA needs dirty checking within @Transactional
        // Actually, JPA will auto-flush dirty entities, so we just need to be in a transaction
        // But Kotlin data class fields are val (immutable), so we can't modify them directly
        // Solution: save a new copy with updated fields
        val updated = domain.copy(
            value = value ?: domain.value,
            labelZh = labelZh ?: domain.labelZh,
            labelEn = labelEn ?: domain.labelEn,
            icon = icon ?: domain.icon,
            isActive = isActive ?: domain.isActive
        )
        return domainRepo.save(updated)
    }

    @Transactional
    fun delete(id: Long) {
        val domain = domainRepo.findById(id).orElseThrow { IllegalArgumentException("Domain not found: $id") }
        // Soft delete: mark as inactive
        domainRepo.save(domain.copy(isActive = false))
    }

    @Transactional
    fun ensureSeedData() {
        if (domainRepo.count() == 0L) {
            domainRepo.save(DomainConfig(value = "theology", labelZh = "神学", labelEn = "Theology", icon = "✝️", sortOrder = 1))
            domainRepo.save(DomainConfig(value = "english", labelZh = "英语", labelEn = "English", icon = "📖", sortOrder = 2))
            domainRepo.save(DomainConfig(value = "cs", labelZh = "计算机", labelEn = "Computer Science", icon = "💻", sortOrder = 3))
            domainRepo.save(DomainConfig(value = "university", labelZh = "大学", labelEn = "University", icon = "🎓", sortOrder = 4))
        }
    }
}
