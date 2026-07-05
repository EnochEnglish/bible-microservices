package com.bible.monolith.repository

import com.bible.monolith.model.Organization
import com.bible.monolith.model.UserOrgMembership
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface OrganizationRepository : JpaRepository<Organization, Long> {
    fun findByDomainAndEnabledTrue(domain: String): List<Organization>
    fun findByEnabledTrue(): List<Organization>
}

@Repository
interface UserOrgMembershipRepository : JpaRepository<UserOrgMembership, Long> {
    fun findByUserId(userId: Long): List<UserOrgMembership>
    fun findByOrgId(orgId: Long): List<UserOrgMembership>
    fun findByUserIdAndOrgId(userId: Long, orgId: Long): UserOrgMembership?
    fun findByOrgIdAndOrgRole(orgId: Long, orgRole: String): List<UserOrgMembership>
    fun deleteByOrgId(orgId: Long)
}
