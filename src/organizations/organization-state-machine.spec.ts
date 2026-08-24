import { canTransitionOrganization, ORGANIZATION_TRANSITIONS } from './organization-state-machine';
import {
  OrganizationStatus,
  TERMINAL_ORGANIZATION_STATUSES,
} from './entities/organization-status.enum';

describe('organization-state-machine', () => {
  it('permite el camino feliz completo', () => {
    expect(canTransitionOrganization(OrganizationStatus.EN_TRAMITE, OrganizationStatus.APROBADA)).toBe(true);
    expect(canTransitionOrganization(OrganizationStatus.APROBADA, OrganizationStatus.CREADA)).toBe(true);
    expect(canTransitionOrganization(OrganizationStatus.CREADA, OrganizationStatus.VERIFICADA)).toBe(true);
  });

  it('permite el rechazo desde EN_TRAMITE y APROBADA', () => {
    expect(canTransitionOrganization(OrganizationStatus.EN_TRAMITE, OrganizationStatus.RECHAZADA)).toBe(true);
    expect(canTransitionOrganization(OrganizationStatus.APROBADA, OrganizationStatus.RECHAZADA)).toBe(true);
  });

  it('rechaza transiciones inválidas', () => {
    expect(canTransitionOrganization(OrganizationStatus.EN_TRAMITE, OrganizationStatus.CREADA)).toBe(false);
    expect(canTransitionOrganization(OrganizationStatus.EN_TRAMITE, OrganizationStatus.VERIFICADA)).toBe(false);
    expect(canTransitionOrganization(OrganizationStatus.APROBADA, OrganizationStatus.VERIFICADA)).toBe(false);
    expect(canTransitionOrganization(OrganizationStatus.CREADA, OrganizationStatus.APROBADA)).toBe(false);
  });

  it('rechazada no puede reintentar el trámite', () => {
    expect(canTransitionOrganization(OrganizationStatus.RECHAZADA, OrganizationStatus.EN_TRAMITE)).toBe(false);
  });

  it('los estados terminales no tienen transiciones', () => {
    for (const status of TERMINAL_ORGANIZATION_STATUSES) {
      expect(ORGANIZATION_TRANSITIONS[status]).toHaveLength(0);
    }
  });
});
