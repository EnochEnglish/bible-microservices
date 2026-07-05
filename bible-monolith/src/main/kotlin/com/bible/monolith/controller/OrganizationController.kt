package com.bible.monolith.controller

import com.bible.monolith.dto.*
import com.bible.monolith.security.JwtUtil
import com.bible.monolith.service.OrganizationService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/orgs")
class OrganizationController(
    private val orgService: OrganizationService,
    private val jwtUtil: JwtUtil
) {
    // ─── Public: List & View ───

    @GetMapping
    fun listOrganizations(@RequestParam(required = false) domain: String?): List<OrganizationDto> {
        return orgService.listOrganizations(domain)
    }

    @GetMapping("/{orgId}")
    fun getOrganization(@PathVariable orgId: Long): ResponseEntity<OrganizationDto> {
        val org = orgService.getOrganization(orgId) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(org)
    }

    // ─── Admin: CRUD ───

    @PostMapping
    fun createOrganization(
        @RequestHeader("Authorization") auth: String,
        @RequestBody body: CreateOrganizationRequest
    ): OrganizationDto {
        return orgService.createOrganization(body)
    }

    @PutMapping("/{orgId}")
    fun updateOrganization(
        @PathVariable orgId: Long,
        @RequestBody body: UpdateOrganizationRequest
    ): ResponseEntity<OrganizationDto> {
        val org = orgService.updateOrganization(orgId, body) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(org)
    }

    @DeleteMapping("/{orgId}")
    fun deleteOrganization(@PathVariable orgId: Long): ResponseEntity<Map<String, Any>> {
        orgService.deleteOrganization(orgId)
        return ResponseEntity.ok(mapOf("ok" to true, "deleted" to orgId))
    }

    // ─── Memberships ───

    @GetMapping("/{orgId}/members")
    fun listMembers(@PathVariable orgId: Long): List<MembershipDto> {
        return orgService.listMembers(orgId)
    }

    @GetMapping("/my/memberships")
    fun myMemberships(@RequestHeader("Authorization") auth: String): List<MembershipDto> {
        val userId = extractUserId(auth)
        return orgService.listMyOrganizations(userId)
    }

    @PostMapping("/{orgId}/members")
    fun addMember(
        @PathVariable orgId: Long,
        @RequestBody body: AddMemberRequest
    ): MembershipDto {
        return orgService.addMember(body, orgId)
    }

    @PutMapping("/memberships/{membershipId}")
    fun updateMembership(
        @PathVariable membershipId: Long,
        @RequestBody body: UpdateMembershipRequest
    ): ResponseEntity<MembershipDto> {
        val m = orgService.updateMembership(membershipId, body) ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(m)
    }

    @DeleteMapping("/memberships/{membershipId}")
    fun removeMember(@PathVariable membershipId: Long): ResponseEntity<Map<String, Any>> {
        orgService.removeMember(membershipId)
        return ResponseEntity.ok(mapOf("ok" to true, "removed" to membershipId))
    }

    private fun extractUserId(auth: String): Long {
        val token = auth.removePrefix("Bearer ")
        return jwtUtil.getUserId(token)
    }
}
