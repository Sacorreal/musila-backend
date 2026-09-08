import { Global, Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanCapability } from 'src/entitlements/entities/plan-capability.entity';
import { Subscription } from 'src/entitlements/entities/subscription.entity';
import { EntitlementsModule } from 'src/entitlements/entitlements.module';
import { OrganizationsModule } from 'src/organizations/organizations.module';
import { StaffAuditModule } from 'src/staff-audit/staff-audit.module';
import { AuthModule } from 'src/auth/auth.module';
import { AuthorizationAdminController } from './authorization-admin.controller';
import { AuthorizationService } from './authorization.service';
import { AuthorizationCacheService } from './cache/authorization-cache.service';
import { CapabilitiesAdminController } from './capabilities-admin.controller';
import { CapabilityService } from './capability.service';
import { Capability } from './entities/capability.entity';
import { MembershipRole } from './entities/membership-role.entity';
import { Role } from './entities/role.entity';
import { RoleCapability } from './entities/role-capability.entity';
import { AuthorizationGuard } from './guards/authorization.guard';
import { AuthorizationCacheInvalidationListener } from './listeners/authorization-cache-invalidation.listener';
import { OrganizationRolesController } from './organization-roles.controller';
import { PermissionsCatalogController } from './permissions-catalog.controller';
import { RoleService } from './role.service';
import { UsersMeCapabilitiesController } from './users-me-capabilities.controller';

/**
 * Motor de autorización unificado (capabilities, roles, memberships).
 * Global para que `AuthorizationGuard` y `AuthorizationService` sean
 * inyectables desde cualquier módulo sin importar explícitamente.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Capability,
      Role,
      RoleCapability,
      MembershipRole,
      Subscription,
      PlanCapability,
    ]),
    OrganizationsModule,
    EntitlementsModule,
    forwardRef(() => StaffAuditModule),
    forwardRef(() => AuthModule),
  ],
  controllers: [
    PermissionsCatalogController,
    OrganizationRolesController,
    UsersMeCapabilitiesController,
    AuthorizationAdminController,
    CapabilitiesAdminController,
  ],
  providers: [
    AuthorizationCacheService,
    AuthorizationService,
    CapabilityService,
    RoleService,
    AuthorizationGuard,
    AuthorizationCacheInvalidationListener,
  ],
  exports: [
    AuthorizationService,
    CapabilityService,
    RoleService,
    AuthorizationGuard,
    AuthorizationCacheService,
    TypeOrmModule,
  ],
})
export class AuthorizationModule {}
