import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from 'src/shared/mail/email.module';
import { StaffAuditModule } from 'src/staff-audit/staff-audit.module';
import { OrganizationInvite } from './entities/organization-invite.entity';
import { OrganizationMembership } from './entities/organization-membership.entity';
import { Organization } from './entities/organization.entity';
import { OrganizationSecurityPolicy } from './entities/organization-security-policy.entity';
import { RosterMembership } from './entities/roster-membership.entity';
import { Tenant } from './entities/tenant.entity';
import { Trackspace } from './entities/trackspace.entity';
import { MembershipService } from './membership.service';
import { OrganizationInviteService } from './organization-invite.service';
import { OrganizationSecurityPolicyService } from './organization-security-policy.service';
import { OrganizationInviteListener } from './listeners/organization-invite.listener';
import { OrganizationInvitesController } from './organization-invites.controller';
import { OrganizationMembersController } from './organization-members.controller';
import { OrganizationSecurityPolicyController } from './organization-security-policy.controller';
import { OrganizationsAdminController } from './organizations-admin.controller';
import { OrganizationsService } from './organizations.service';
import { TrackspacesController } from './trackspaces.controller';
import { UsersMeMembershipsController } from './users-me-memberships.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tenant,
      Organization,
      Trackspace,
      OrganizationMembership,
      RosterMembership,
      OrganizationInvite,
      OrganizationSecurityPolicy,
    ]),
    EmailModule,
    forwardRef(() => StaffAuditModule),
  ],
  controllers: [
    OrganizationsAdminController,
    OrganizationMembersController,
    UsersMeMembershipsController,
    TrackspacesController,
    OrganizationInvitesController,
    OrganizationSecurityPolicyController,
  ],
  providers: [
    OrganizationsService,
    MembershipService,
    OrganizationInviteService,
    OrganizationSecurityPolicyService,
    OrganizationInviteListener,
  ],
  exports: [
    OrganizationsService,
    MembershipService,
    OrganizationInviteService,
    OrganizationSecurityPolicyService,
    TypeOrmModule,
  ],
})
export class OrganizationsModule {}
