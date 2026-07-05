package com.bible.monolith.dto

import java.time.Instant

// ─── Organization DTOs ───

data class OrganizationDto(
    val id: Long,
    val name: String,
    val nameEn: String?,
    val domain: String,
    val type: String,
    val description: String?,
    val logoUrl: String?,
    val location: String?,
    val contactEmail: String?,
    val contactPhone: String?,
    val enabled: Boolean,
    val memberCount: Int,
    val createdAt: Instant
)

data class CreateOrganizationRequest(
    val name: String,
    val nameEn: String? = null,
    val domain: String = "theology",
    val type: String = "community",
    val description: String? = null,
    val logoUrl: String? = null,
    val location: String? = null,
    val contactEmail: String? = null,
    val contactPhone: String? = null
)

data class UpdateOrganizationRequest(
    val name: String? = null,
    val nameEn: String? = null,
    val description: String? = null,
    val logoUrl: String? = null,
    val location: String? = null,
    val contactEmail: String? = null,
    val contactPhone: String? = null,
    val enabled: Boolean? = null
)

// ─── Membership DTOs ───

data class MembershipDto(
    val id: Long,
    val userId: Long,
    val username: String,
    val orgId: Long,
    val orgName: String,
    val orgRole: String,
    val department: String?,
    val title: String?,
    val joinedAt: Instant,
    val active: Boolean
)

data class AddMemberRequest(
    val userId: Long,
    val orgRole: String = "MEMBER",
    val department: String? = null,
    val title: String? = null
)

data class UpdateMembershipRequest(
    val orgRole: String? = null,
    val department: String? = null,
    val title: String? = null,
    val active: Boolean? = null
)

data class OrganizationListResponse(
    val success: Boolean,
    val organizations: List<OrganizationDto> = emptyList(),
    val message: String? = null
)

data class MembershipListResponse(
    val success: Boolean,
    val memberships: List<MembershipDto> = emptyList(),
    val message: String? = null
)
