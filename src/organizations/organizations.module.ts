import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffAuditModule } from 'src/staff-audit/staff-audit.module';
import { OrganizationMembership } from './entities/organization-membership.entity';
import { Organization } from './entities/organization.entity';
import { RosterMembership } from './entities/roster-membership.entity';
import { Tenant } from './entities/tenant.entity';
import { Trackspace } from './entities/trackspace.entity';
import { MembershipService } from './membership.service';
import { OrganizationMembersController } from './organization-members.controller';
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
    ]),
    forwardRef(() => StaffAuditModule),
  ],
  controllers: [
    OrganizationsAdminController,
    OrganizationMembersController,
    UsersMeMembershipsController,
    TrackspacesController,
  ],
  providers: [OrganizationsService, MembershipService],
  exports: [OrganizationsService, MembershipService, TypeOrmModule],
})
export class OrganizationsModule {}
