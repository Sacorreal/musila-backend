import { OrganizationStatus } from './entities/organization-status.enum';

/**
 * Transiciones válidas del onboarding comercial de una organización B2B.
 * Fuente única de verdad: cualquier cambio de `Organization.status` debe
 * validarse contra este mapa (`OrganizationsService.transitionStatus`). Los
 * estados terminales no tienen destinos.
 */
export const ORGANIZATION_TRANSITIONS: Record<OrganizationStatus, readonly OrganizationStatus[]> = {
  [OrganizationStatus.EN_TRAMITE]: [OrganizationStatus.APROBADA, OrganizationStatus.RECHAZADA],
  [OrganizationStatus.APROBADA]: [OrganizationStatus.CREADA, OrganizationStatus.RECHAZADA],
  [OrganizationStatus.CREADA]: [OrganizationStatus.VERIFICADA],
  [OrganizationStatus.VERIFICADA]: [],
  [OrganizationStatus.RECHAZADA]: [],
};

/** ¿Es válido pasar de `from` a `to`? */
export function canTransitionOrganization(from: OrganizationStatus, to: OrganizationStatus): boolean {
  return ORGANIZATION_TRANSITIONS[from]?.includes(to) ?? false;
}
