/**
 * Ciclo de vida de onboarding comercial de una organización B2B
 * (`requerimientos/B2B/registro-legal-b2b.md`):
 *
 *   EN_TRAMITE → APROBADA → CREADA → VERIFICADA
 *
 * con rama RECHAZADA. Eje independiente del estado de facturación
 * (`SubscriptionStatus` en `entitlements/`): una organización puede estar
 * VERIFICADA y, más adelante, tener su `Subscription` en `PAST_DUE`.
 */
export enum OrganizationStatus {
  /** Formulario público enviado, a la espera de revisión del admin de Musila. */
  EN_TRAMITE = 'EN_TRAMITE',
  /** Aprobada por el admin de Musila; puede tener un link de pago pendiente. */
  APROBADA = 'APROBADA',
  /** Pago confirmado (o validado manualmente); puede crear su primer perfil. */
  CREADA = 'CREADA',
  /** Pago válido (si aplica) + superadmin + representante legal verificados. */
  VERIFICADA = 'VERIFICADA',
  /** Rechazada por el admin de Musila (conserva `rejectionReason`). */
  RECHAZADA = 'RECHAZADA',
}

/** Estados que aún no completaron el onboarding comercial. */
export const LIVE_ORGANIZATION_STATUSES: readonly OrganizationStatus[] = [
  OrganizationStatus.EN_TRAMITE,
  OrganizationStatus.APROBADA,
  OrganizationStatus.CREADA,
];

/** Estados terminales: no admiten transiciones posteriores. */
export const TERMINAL_ORGANIZATION_STATUSES: readonly OrganizationStatus[] = [
  OrganizationStatus.VERIFICADA,
  OrganizationStatus.RECHAZADA,
];
