import { Injectable } from '@nestjs/common';

interface CachedUserPermissions {
  permissions: Set<string>;
  roleName: string;
  staffRoleId: string;
  expiresAt: number;
}

/**
 * Caché en memoria del propio proceso (no hay Redis instalado). El TTL es
 * solo una red de contención ante ediciones directas en BD fuera de la API
 * — la invalidación real es activa e inmediata vía eventos del
 * `EventBusService` (ver `StaffCacheInvalidationListener`), nunca se espera
 * al TTL en el flujo normal de la aplicación.
 */
@Injectable()
export class StaffPermissionCacheService {
  private static readonly TTL_MS = 5 * 60 * 1000;

  private readonly userPermissions = new Map<string, CachedUserPermissions>();

  get(userId: string): CachedUserPermissions | undefined {
    const cached = this.userPermissions.get(userId);
    if (!cached) return undefined;

    if (cached.expiresAt < Date.now()) {
      this.userPermissions.delete(userId);
      return undefined;
    }

    return cached;
  }

  set(userId: string, permissions: Set<string>, roleName: string, staffRoleId: string): void {
    this.userPermissions.set(userId, {
      permissions,
      roleName,
      staffRoleId,
      expiresAt: Date.now() + StaffPermissionCacheService.TTL_MS,
    });
  }

  invalidateUser(userId: string): void {
    this.userPermissions.delete(userId);
  }

  /** Invalida a todos los usuarios cacheados con ese rol (cambió el rol, no la asignación puntual). */
  invalidateByRole(staffRoleId: string): void {
    for (const [userId, cached] of this.userPermissions.entries()) {
      if (cached.staffRoleId === staffRoleId) {
        this.userPermissions.delete(userId);
      }
    }
  }
}
