package com.bible.monolith.service

import com.bible.monolith.dto.*
import com.bible.monolith.model.Organization
import com.bible.monolith.model.UserOrgMembership
import com.bible.monolith.repository.OrganizationRepository
import com.bible.monolith.repository.UserOrgMembershipRepository
import com.bible.monolith.repository.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

@Service
class OrganizationService(
    private val orgRepo: OrganizationRepository,
    private val membershipRepo: UserOrgMembershipRepository,
    private val userRepo: UserRepository
) {
    private val log = LoggerFactory.getLogger(OrganizationService::class.java)

    // ─── Organizations ───

    fun listOrganizations(domain: String? = null): List<OrganizationDto> {
        val orgs = if (domain != null) orgRepo.findByDomainAndEnabledTrue(domain)
                   else orgRepo.findByEnabledTrue()
        return orgs.map { toOrgDto(it) }
    }

    fun getOrganization(orgId: Long): OrganizationDto? {
        return orgRepo.findById(orgId).map { toOrgDto(it) }.orElse(null)
    }

    @Transactional
    fun createOrganization(req: CreateOrganizationRequest): OrganizationDto {
        val org = Organization(
            name = req.name,
            nameEn = req.nameEn,
            domain = req.domain,
            type = req.type,
            description = req.description,
            logoUrl = req.logoUrl,
            location = req.location,
            contactEmail = req.contactEmail,
            contactPhone = req.contactPhone
        )
        return toOrgDto(orgRepo.save(org))
    }

    @Transactional
    fun updateOrganization(orgId: Long, req: UpdateOrganizationRequest): OrganizationDto? {
        val org = orgRepo.findById(orgId).orElse(null) ?: return null
        val updated = org.copy(
            name = req.name ?: org.name,
            nameEn = req.nameEn ?: org.nameEn,
            description = req.description ?: org.description,
            logoUrl = req.logoUrl ?: org.logoUrl,
            location = req.location ?: org.location,
            contactEmail = req.contactEmail ?: org.contactEmail,
            contactPhone = req.contactPhone ?: org.contactPhone,
            enabled = req.enabled ?: org.enabled,
            updatedAt = Instant.now()
        )
        return toOrgDto(orgRepo.save(updated))
    }

    @Transactional
    fun deleteOrganization(orgId: Long) {
        membershipRepo.deleteByOrgId(orgId)
        orgRepo.deleteById(orgId)
        log.info("Organization {} deleted", orgId)
    }

    // ─── Memberships ───

    fun listMembers(orgId: Long): List<MembershipDto> {
        return membershipRepo.findByOrgId(orgId).map { toMembershipDto(it) }
    }

    fun listMyOrganizations(userId: Long): List<MembershipDto> {
        return membershipRepo.findByUserId(userId).map { toMembershipDto(it) }
    }

    @Transactional
    fun addMember(req: AddMemberRequest, orgId: Long): MembershipDto {
        val existing = membershipRepo.findByUserIdAndOrgId(req.userId, orgId)
        if (existing != null) {
            // Update role if already member
            val updated = existing.copy(orgRole = req.orgRole, department = req.department, title = req.title)
            return toMembershipDto(membershipRepo.save(updated))
        }
        val membership = membershipRepo.save(UserOrgMembership(
            userId = req.userId,
            orgId = orgId,
            orgRole = req.orgRole,
            department = req.department,
            title = req.title
        ))
        log.info("User {} added to org {} as {}", req.userId, orgId, req.orgRole)
        return toMembershipDto(membership)
    }

    @Transactional
    fun updateMembership(membershipId: Long, req: UpdateMembershipRequest): MembershipDto? {
        val m = membershipRepo.findById(membershipId).orElse(null) ?: return null
        val updated = m.copy(
            orgRole = req.orgRole ?: m.orgRole,
            department = req.department ?: m.department,
            title = req.title ?: m.title,
            active = req.active ?: m.active
        )
        return toMembershipDto(membershipRepo.save(updated))
    }

    @Transactional
    fun removeMember(membershipId: Long) {
        membershipRepo.deleteById(membershipId)
    }

    // ─── Permission helpers ───

    fun isOrgAdmin(userId: Long, orgId: Long): Boolean {
        val m = membershipRepo.findByUserIdAndOrgId(userId, orgId) ?: return false
        return m.orgRole in listOf("OWNER", "ADMIN") && m.active
    }

    fun isOrgMember(userId: Long, orgId: Long): Boolean {
        val m = membershipRepo.findByUserIdAndOrgId(userId, orgId) ?: return false
        return m.active
    }

    // ─── DTO Mappers ───

    private fun toOrgDto(o: Organization): OrganizationDto {
        val count = membershipRepo.findByOrgId(o.id).count { it.active }
        return OrganizationDto(
            id = o.id, name = o.name, nameEn = o.nameEn,
            domain = o.domain, type = o.type, description = o.description,
            logoUrl = o.logoUrl, location = o.location,
            contactEmail = o.contactEmail, contactPhone = o.contactPhone,
            enabled = o.enabled, memberCount = count, createdAt = o.createdAt
        )
    }

    private fun toMembershipDto(m: UserOrgMembership): MembershipDto {
        val user = userRepo.findById(m.userId).orElse(null)
        val org = orgRepo.findById(m.orgId).orElse(null)
        return MembershipDto(
            id = m.id, userId = m.userId,
            username = user?.username ?: "unknown",
            orgId = m.orgId, orgName = org?.name ?: "unknown",
            orgRole = m.orgRole, department = m.department, title = m.title,
            joinedAt = m.joinedAt, active = m.active
        )
    }
}
