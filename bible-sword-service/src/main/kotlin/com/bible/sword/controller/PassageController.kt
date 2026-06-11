package com.bible.sword.controller

import com.bible.sword.dto.PassageResponse
import com.bible.sword.dto.VerseInfo
import com.bible.sword.dto.WordInfo
import com.bible.sword.service.SwordPassageService
import com.bible.sword.service.SwordRegistry
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/sword")
class PassageController(
    private val passageService: SwordPassageService,
    private val swordRegistry: SwordRegistry
) {

    /**
     * Get verses for a passage reference.
     *
     * Reference formats:
     *   Gen.1     — whole chapter
     *   Gen.1.1   — single verse
     *   Gen.1.1-Gen.1.5 — verse range
     *
     * When ?strongs=true and module has Strong's data,
     * each verse includes word-level data (lemma, morph, Strong's number).
     */
    @GetMapping("/{module}/passage/{reference}")
    fun getPassage(
        @PathVariable module: String,
        @PathVariable reference: String,
        @RequestParam(defaultValue = "true") strongs: Boolean
    ): PassageResponse {
        val verses = passageService.getPassage(module, reference)

        // Strip Strong's data if not requested
        val displayVerses = if (!strongs) {
            verses.map { it.copy(words = null) }
        } else {
            verses
        }

        val mod = swordRegistry.getModule(module)
        return PassageResponse(
            module = module.uppercase(),
            reference = reference,
            versification = mod?.versification,
            verseCount = displayVerses.size,
            verses = displayVerses
        )
    }

    /**
     * Extract all Strong's numbers present in a passage.
     * Useful for building interlinear displays.
     */
    @GetMapping("/{module}/passage/{reference}/strongs")
    fun getStrongs(
        @PathVariable module: String,
        @PathVariable reference: String
    ): Map<String, Any> {
        val verses = passageService.getPassage(module, reference)
        val allStrongs = verses.flatMap { v ->
            v.words?.mapNotNull { w -> w.strongs } ?: emptyList()
        }.distinct().sorted()

        // Group by prefix: G=Greek, H=Hebrew
        val byLanguage = allStrongs.groupBy { s ->
            when {
                s.startsWith("G") || s.startsWith("g") -> "Greek"
                s.startsWith("H") || s.startsWith("h") -> "Hebrew"
                else -> "Other"
            }
        }

        return mapOf(
            "module" to module.uppercase(),
            "reference" to reference,
            "total" to allStrongs.size,
            "numbers" to allStrongs,
            "byLanguage" to byLanguage.mapValues { it.value.size }
        )
    }
}
