import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'AUDIT_ACTION_KEY';

/**
 * Marca un endpoint para ser auditado por `StaffAuditInterceptor`.
 * `code` sigue el formato "modulo:accion" (mismo formato que los
 * permisos, ej. `@RequireStaffPermission`).
 */
export const AuditAction = (code: string) => SetMetadata(AUDIT_ACTION_KEY, code);
