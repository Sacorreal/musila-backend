import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffUserRole } from './entities/staff-user-role.entity';
import { StaffPermissionCacheService } from './cache/staff-permission-cache.service';

export interface StaffUserPermissions {
  staffRoleId: string;
  roleName: string;
  permissions: Set<string>;
}

@Injectable()
export class StaffAuthorizationService {
  constructor(
    @InjectRepository(StaffUserRole)
    private readonly staffUserRoleRepository: Repository<StaffUserRole>,
    private readonly cache: StaffPermissionCacheService,
  ) {}

  /** Resuelve los permisos del usuario: caché primero, BD en caso de miss. */
  async getUserPermissions(userId: string): Promise<StaffUserPermissions | undefined> {
    const cached = this.cache.get(userId);
    if (cached) {
      return { staffRoleId: cached.staffRoleId, roleName: cached.roleName, permissions: cached.permissions };
    }

    const assignment = await this.staffUserRoleRepository.findOne({
      where: { userId },
      relations: { staffRole: { permissions: true } },
    });

    if (!assignment) return undefined;

    const permissions = new Set(assignment.staffRole.permissions.map((permission) => permission.code));
    this.cache.set(userId, permissions, assignment.staffRole.name, assignment.staffRoleId);

    return { staffRoleId: assignment.staffRoleId, roleName: assignment.staffRole.name, permissions };
  }

  async hasPermission(userId: string, requiredCodes: string[]): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    if (!userPermissions) return false;

    return requiredCodes.some((code) => userPermissions.permissions.has(code));
  }
}
