import { RegistrationDomain } from './registration-domain.enum';
import { ValidationIssue, ValidationSeverity } from './validation-engine.types';

export function buildIssue(
  domain: RegistrationDomain,
  code: string,
  severity: ValidationSeverity,
  message: string,
  field?: string,
): ValidationIssue {
  return { domain, code, severity, message, field };
}
