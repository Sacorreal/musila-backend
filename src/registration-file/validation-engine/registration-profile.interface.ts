import { RegistrationProfileKey } from '../entities/registration-profile-key.type';
import { RegistrationDomain } from './registration-domain.enum';
import { RegistrationRule } from './registration-rule.interface';
import { RegistrationFileSnapshot } from './validation-engine.types';

/**
 * Strategy en código (sin tabla en BD) que representa las reglas de un
 * destino de registro (SAYCO, DNDA, futuros Editoriales/Distribuidoras).
 * Las reglas NO viven en el expediente ni en componentes de interfaz —
 * agregar un perfil nuevo no requiere migrar el esquema, solo registrar una
 * nueva implementación de esta interfaz.
 */
export interface RegistrationProfile {
  readonly key: RegistrationProfileKey;
  readonly label: string;

  /** Reglas de negocio (errores/advertencias) que este perfil evalúa. */
  getRules(): RegistrationRule[];

  /** Tipos de documento que este perfil exige para el estado actual del expediente. */
  getRequiredDocumentTypes(snapshot: RegistrationFileSnapshot): string[];

  /** Si este dominio aplica para este perfil dado el estado actual (ej. Editorial solo si hasPublishingDeal). */
  isDomainApplicable(domain: RegistrationDomain, snapshot: RegistrationFileSnapshot): boolean;

  /** % de completitud (0-100) de un dominio aplicable, según los requisitos propios de este perfil. */
  computeDomainCompleteness(domain: RegistrationDomain, snapshot: RegistrationFileSnapshot): number;
}
