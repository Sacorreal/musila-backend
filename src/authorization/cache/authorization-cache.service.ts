import { Injectable } from '@nestjs/common';
import { EffectiveCapabilities } from '../interfaces/authorization.types';

interface CachedEffectiveCapabilities {
  effective: EffectiveCapabilities;
  expiresAt: number;
}

const PERSONAL_CONTEXT_KEY = '~personal';

/**
 * Caché en memoria del propio proceso (no hay Redis instalado), mismo
 * patrón que `StaffPermissionCacheService`. El TTL es una red de
 * contención; la invalidación real es activa vía eventos del
 * `EventBusService` (ver `AuthorizationCacheInvalidationListener`).
 */
@Injectable()
export class AuthorizationCacheService {
  private static readonly TTL_MS = 60 * 1000;

  private readonly entries = new Map<string, CachedEffectiveCapabilities>();

  get(userId: string, organizationId?: string): EffectiveCapabilities | undefined {
    const cached = this.entries.get(this.buildKey(userId, organizationId));
    if (!cached) return undefined;

    if (cached.expiresAt < Date.now()) {
      this.entries.delete(this.buildKey(userId, organizationId));
      return undefined;
    }

    return cached.effective;
  }

  set(userId: string, organizationId: string | undefined, effective: EffectiveCapabilities): void {
    this.entries.set(this.buildKey(userId, organizationId), {
      effective,
      expiresAt: Date.now() + AuthorizationCacheService.TTL_MS,
    });
  }

  invalidateUser(userId: string): void {
    const prefix = `${userId}|`;
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) this.entries.delete(key);
    }
  }

  /** Cambió un rol, una capability o un plan: no se conoce el conjunto de usuarios afectados. */
  invalidateAll(): void {
    this.entries.clear();
  }

  private buildKey(userId: string, organizationId?: string): string {
    return `${userId}|${organizationId ?? PERSONAL_CONTEXT_KEY}`;
  }
}
