import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { RegistrationFile } from '../entities/registration-file.entity';
import { ChecklistItem } from '../validation-engine/validation-engine.types';
import {
  RegistrationGenerationResult,
  RegistrationPreparationResult,
  RegistrationProviderName,
} from './registration-provider.types';

/**
 * Token de inyección de NestJS para el proveedor de registro activo.
 * La lógica de negocio depende de este puerto, no de una implementación concreta.
 */
export const REGISTRATION_PROVIDER = Symbol('REGISTRATION_PROVIDER');

/**
 * Puerto de la capa de dominio que abstrae "quién ejecuta la preparación y
 * eventual presentación" del expediente. `ManualRegistrationProvider` es la
 * única implementación funcional hoy: prepara el expediente para que el
 * propio usuario lo presente manualmente ante SAYCO/DNDA. Futuros
 * `SaycoApiProvider`/`DndaApiProvider` podrán automatizar `submitToExternalSystem`
 * sin tocar `RegistrationFile`, el `ValidationEngine` ni el modelo de datos.
 */
export interface RegistrationProvider {
  readonly name: RegistrationProviderName;

  /** Corre el Validation Engine, persiste el snapshot de completitud y el status calculado. */
  prepareFile(registrationFileId: string, user: JwtPayload): Promise<RegistrationPreparationResult>;

  /** Genera el PDF resumen + ZIP del expediente y los sube a storage. */
  generateDocuments(registrationFileId: string, user: JwtPayload): Promise<RegistrationGenerationResult>;

  /** Checklist inteligente (✔ / ⚠) derivado de la última preparación. */
  generateChecklist(registrationFileId: string, user: JwtPayload): Promise<ChecklistItem[]>;

  /** Exige 100% sin errores; genera los documentos y marca LISTO_PARA_PRESENTAR. */
  markReadyForSubmission(registrationFileId: string, user: JwtPayload): Promise<RegistrationFile>;

  /**
   * Envío automatizado a la entidad externa. Musila es un sistema de
   * PREPARACIÓN de expedientes, no de registro — este método existe solo
   * para satisfacer el contrato del Strategy y documentar la extensión
   * futura; ningún controller lo expone hoy.
   */
  submitToExternalSystem(registrationFileId: string, user: JwtPayload): Promise<never>;
}
