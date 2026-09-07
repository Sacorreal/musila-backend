import { RegistrationFileStatus } from '../entities/registration-file-status.enum';
import { ALL_REGISTRATION_DOMAINS, REGISTRATION_DOMAIN_LABELS, RegistrationDomain } from './registration-domain.enum';
import { RegistrationProfile } from './registration-profile.interface';
import {
  ChecklistItem,
  DomainCompleteness,
  RegistrationFileSnapshot,
  ValidationIssue,
  ValidationResult,
} from './validation-engine.types';

/**
 * Motor de validación del expediente: puro TypeScript, sin decoradores de
 * Nest, testeable sin `TestingModule`. No depende de la interfaz gráfica —
 * toma un snapshot inmutable y los perfiles activos, y calcula completitud,
 * errores/advertencias y el estado resultante.
 *
 * "Aplicable" se decide por perfil: si NINGÚN perfil activo considera un
 * dominio aplicable (ej. Editorial sin `hasPublishingDeal`), el dominio se
 * excluye del promedio global y se reporta como "No aplica" — tal como lo
 * describe el ejemplo del requerimiento.
 */
export class ValidationEngine {
  constructor(private readonly profiles: RegistrationProfile[]) {}

  run(snapshot: RegistrationFileSnapshot): ValidationResult {
    const domains = ALL_REGISTRATION_DOMAINS.map((domain) => this.evaluateDomain(domain, snapshot));
    const applicableDomains = domains.filter((d) => d.applicable);

    const overallPercentage = applicableDomains.length
      ? Math.round(applicableDomains.reduce((sum, d) => sum + d.percentage, 0) / applicableDomains.length)
      : 0;

    const errors = domains.flatMap((d) => d.issues.filter((issue) => issue.severity === 'error'));
    const warnings = domains.flatMap((d) => d.issues.filter((issue) => issue.severity === 'warning'));
    const status = this.computeStatus(overallPercentage, errors, warnings);
    const checklist = this.buildChecklist(applicableDomains);

    return { overallPercentage, domains, errors, warnings, checklist, status };
  }

  private evaluateDomain(domain: RegistrationDomain, snapshot: RegistrationFileSnapshot): DomainCompleteness {
    const applicableProfiles = this.profiles.filter((profile) => profile.isDomainApplicable(domain, snapshot));

    if (applicableProfiles.length === 0) {
      return { domain, applicable: false, percentage: 100, issues: [] };
    }

    const issues: ValidationIssue[] = applicableProfiles.flatMap((profile) =>
      profile
        .getRules()
        .filter((rule) => rule.domain === domain)
        .flatMap((rule) => rule.evaluate(snapshot)),
    );

    const percentage = Math.round(
      applicableProfiles.reduce((sum, profile) => sum + profile.computeDomainCompleteness(domain, snapshot), 0) /
        applicableProfiles.length,
    );

    return { domain, applicable: true, percentage, issues: this.dedupeIssues(issues) };
  }

  private dedupeIssues(issues: ValidationIssue[]): ValidationIssue[] {
    const seen = new Set<string>();
    return issues.filter((issue) => {
      const key = `${issue.code}:${issue.field ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private computeStatus(
    overallPercentage: number,
    errors: ValidationIssue[],
    warnings: ValidationIssue[],
  ): RegistrationFileStatus {
    if (overallPercentage === 0) return RegistrationFileStatus.EN_CONSTRUCCION;
    if (overallPercentage < 100 || errors.length > 0) return RegistrationFileStatus.INCOMPLETO;
    if (warnings.length > 0) return RegistrationFileStatus.VALIDADO_PARCIALMENTE;
    return RegistrationFileStatus.LISTO_PARA_PRESENTAR;
  }

  private buildChecklist(applicableDomains: DomainCompleteness[]): ChecklistItem[] {
    const items: ChecklistItem[] = [];

    for (const domain of applicableDomains) {
      if (domain.issues.length === 0) {
        items.push({ label: `${REGISTRATION_DOMAIN_LABELS[domain.domain]} completo`, satisfied: true, severity: 'ok' });
        continue;
      }
      for (const issue of domain.issues) {
        items.push({ label: issue.message, satisfied: false, severity: issue.severity });
      }
    }

    return items;
  }
}
