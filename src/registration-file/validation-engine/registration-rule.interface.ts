import { RegistrationDomain } from './registration-domain.enum';
import { RegistrationFileSnapshot, ValidationIssue } from './validation-engine.types';

/** Una regla de negocio de un `RegistrationProfile`. Pura: sin efectos secundarios ni acceso a infraestructura. */
export interface RegistrationRule {
  code: string;
  domain: RegistrationDomain;
  evaluate(snapshot: RegistrationFileSnapshot): ValidationIssue[];
}
