import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth/auth.module';
import { StaffAuditModule } from 'src/staff-audit/staff-audit.module';
import { StaffPermission } from './entities/staff-permission.entity';
import { StaffRole } from './entities/staff-role.entity';
import { StaffUserRole } from './entities/staff-user-role.entity';
import { StaffPermissionCacheService } from './cache/staff-permission-cache.service';
import { StaffPermissionGuard } from './guards/staff-permission.guard';
import { StaffAuthorizationService } from './staff-authorization.service';
import { StaffPermissionsService } from './staff-permissions.service';
import { StaffPermissionsController } from './staff-permissions.controller';
import { StaffRolesService } from './staff-roles.service';
import { StaffRolesController } from './staff-roles.controller';
import { StaffMembersService } from './staff-members.service';
import { StaffMembersController } from './staff-members.controller';
import { StaffCacheInvalidationListener } from './listeners/staff-cache-invalidation.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([StaffPermission, StaffRole, StaffUserRole, User]),
    UsersModule,
    forwardRef(() => AuthModule),
    forwardRef(() => StaffAuditModule),
  ],
  controllers: [StaffPermissionsController, StaffRolesController, StaffMembersController],
  providers: [
    StaffPermissionCacheService,
    StaffAuthorizationService,
    StaffPermissionGuard,
    StaffPermissionsService,
    StaffRolesService,
    StaffMembersService,
    StaffCacheInvalidationListener,
  ],
  exports: [StaffAuthorizationService, StaffPermissionCacheService, StaffPermissionGuard],
})
export class StaffAuthorizationModule {}
