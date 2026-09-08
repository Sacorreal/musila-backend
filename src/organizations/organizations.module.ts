import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { PlanCapability } from 'src/entitlements/entities/plan-capability.entity';
import { Subscription } from 'src/entitlements/entities/subscription.entity';
import { LegalIdentityModule } from 'src/legal-identity/legal-identity.module';
import { AppNotificationsModule } from 'src/notifications/notifications.module';
import { EmailModule } from 'src/shared/mail/email.module';
import { StaffAuditModule } from 'src/staff-audit/staff-audit.module';
import { PublisherShareModule } from 'src/publisher-share/publisher-share.module';
import { User } from 'src/users/entities/user.entity';
import { AccessRequest } from './entities/access-request.entity';
import { OrganizationInvite } from './entities/organization-invite.entity';
import { OrganizationMembership } from './entities/organization-membership.entity';
import { Organization } from './entities/organization.entity';
import { OrganizationSecurityPolicy } from './entities/organization-security-policy.entity';
import { RosterMembership } from './entities/roster-membership.entity';
import { Tenant } from './entities/tenant.entity';
import { Trackspace } from './entities/trackspace.entity';
import { WorkspaceInviteLink } from './entities/workspace-invite-link.entity';
import { AccessRequestService } from './access-request.service';
import { MembershipService } from './membership.service';
import { OrganizationInviteService } from './organization-invite.service';
import { OrganizationSecurityPolicyService } from './organization-security-policy.service';
import { WorkspaceInviteService } from './workspace-invite.service';
import { AccessRequestListener } from './listeners/access-request.listener';
import { OrganizationVerifiedGuard } from './guards/organization-verified.guard';
import { OrganizationInviteListener } from './listeners/organization-invite.listener';
import { OrganizationRegistrationEmailListener } from './listeners/organization-registration-email.listener';
import { OrganizationRegistrationNotificationListener } from './listeners/organization-registration-notification.listener';
import { AccessRequestsController } from './access-requests.controller';
import { BusinessRegistrationController } from './business-registration.controller';
import { OrganizationInvitesController } from './organization-invites.controller';
import { OrganizationMembersController } from './organization-members.controller';
import { OrganizationSecurityPolicyController } from './organization-security-policy.controller';
import { OrganizationsAdminController } from './organizations-admin.controller';
import { OrganizationsService } from './organizations.service';
import { TrackspacesController } from './trackspaces.controller';
import { UsersMeMembershipsController } from './users-me-memberships.controller';
import { WorkspaceInvitesController } from './workspace-invites.controller';
import { WorkspaceInvitesPublicController } from './workspace-invites-public.controller';

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
      WorkspaceInviteLink,
      AccessRequest,
      Subscription,
      PlanCapability,
      User,
    ]),
    EmailModule,
    AppNotificationsModule,
    LegalIdentityModule,
    forwardRef(() => StaffAuditModule),
    PublisherShareModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [
    OrganizationsAdminController,
    OrganizationMembersController,
    UsersMeMembershipsController,
    TrackspacesController,
    OrganizationInvitesController,
    OrganizationSecurityPolicyController,
    WorkspaceInvitesController,
    WorkspaceInvitesPublicController,
    AccessRequestsController,
    BusinessRegistrationController,
  ],
  providers: [
    OrganizationsService,
    MembershipService,
    OrganizationInviteService,
    OrganizationSecurityPolicyService,
    WorkspaceInviteService,
    AccessRequestService,
    OrganizationInviteListener,
    AccessRequestListener,
    OrganizationRegistrationEmailListener,
    OrganizationRegistrationNotificationListener,
    OrganizationVerifiedGuard,
  ],
  exports: [
    OrganizationsService,
    MembershipService,
    OrganizationInviteService,
    OrganizationSecurityPolicyService,
    WorkspaceInviteService,
    AccessRequestService,
    TypeOrmModule,
  ],
})
export class OrganizationsModule {}
