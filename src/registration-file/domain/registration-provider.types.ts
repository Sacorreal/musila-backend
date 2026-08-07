import { RegistrationFile } from '../entities/registration-file.entity';
import { ValidationResult } from '../validation-engine/validation-engine.types';

export type RegistrationProviderName = 'manual' | 'sayco-api' | 'dnda-api';

export interface RegistrationPreparationResult {
  registrationFile: RegistrationFile;
  validation: ValidationResult;
}

export interface RegistrationGenerationResult {
  pdfKey: string;
  pdfUrl: string;
  zipKey: string;
  zipUrl: string;
}
