import { WorkState } from '../entities/work-state.enum';
import { RegistrationFileParticipantRole } from '../entities/registration-file-participant-role.enum';
import { RegistrationFileDocumentType } from '../entities/registration-file-document-type.enum';
import { RegistrationFileStatus } from '../entities/registration-file-status.enum';
import {
  AiUsageData,
  CommissionedWorkData,
  DerivativeWorkData,
  PhonogramData,
} from '../entities/registration-file-domain-data.types';
import { RegistrationDomain } from './registration-domain.enum';

/** Recorte de un participante relevante para las reglas de validación. */
export interface ParticipantSnapshot {
  role: RegistrationFileParticipantRole;
  authorialPercentage: number;
  mechanicalPercentage: number;
  managementSociety: string | null;
  saycoCode: string | null;
}

/**
 * Snapshot plano de un `RegistrationFile` para el Validation Engine — puro
 * TypeScript, sin decoradores de Nest ni acceso a TypeORM, para que el motor
 * sea testeable en aislamiento y no dependa de la interfaz.
 */
export interface RegistrationFileSnapshot {
  generalInfo: {
    title: string;
    alternativeTitles: string[];
    language: string;
    genre: string;
    ritmo: string | null;
    durationSeconds: number | null;
    creationDate: string | null;
    creationPlace: string | null;
    workState: WorkState | null;
    version: string | null;
    description: string | null;
  };
  participants: ParticipantSnapshot[];
  hasPublishingDeal: boolean;
  hasPublishingContract: boolean;
  phonogram: PhonogramData | null;
  derivativeWork: DerivativeWorkData | null;
  commissionedWork: CommissionedWorkData | null;
  aiUsage: AiUsageData | null;
  documentTypesPresent: RegistrationFileDocumentType[];
  /** Duración real extraída del audio (metadata del archivo); null si no está disponible todavía. */
  trackAudioDurationSeconds: number | null;
}

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  domain: RegistrationDomain;
  code: string;
  severity: ValidationSeverity;
  message: string;
  field?: string;
}

export interface DomainCompleteness {
  domain: RegistrationDomain;
  applicable: boolean;
  percentage: number;
  issues: ValidationIssue[];
}

export interface ChecklistItem {
  label: string;
  satisfied: boolean;
  severity: 'ok' | ValidationSeverity;
}

export interface ValidationResult {
  overallPercentage: number;
  domains: DomainCompleteness[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  checklist: ChecklistItem[];
  /** Solo hasta LISTO_PARA_PRESENTAR — Presentado/Registrado son transiciones manuales por perfil. */
  status: RegistrationFileStatus;
}
