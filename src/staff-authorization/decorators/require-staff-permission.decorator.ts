import { SetMetadata } from '@nestjs/common';

export const STAFF_PERMISSION_KEY = 'STAFF_PERMISSION_KEY';

/**
 * Exige que el usuario tenga al menos UNO de los permisos indicados (OR),
 * igual flexibilidad que `@AllowedPlans(...)`. Si la ruta no lleva este
 * decorador, `StaffPermissionGuard` no restringe el acceso (permite
 * convivir con `PlansGuard` en rutas no migradas al nuevo sistema).
 */
export const RequireStaffPermission = (...codes: string[]) =>
  SetMetadata(STAFF_PERMISSION_KEY, codes);
