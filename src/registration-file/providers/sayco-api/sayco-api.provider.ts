/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NotImplementedException } from '@nestjs/common';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { RegistrationFile } from '../../entities/registration-file.entity';
import { RegistrationProvider } from '../../domain/registration-provider.interface';
import {
  RegistrationGenerationResult,
  RegistrationPreparationResult,
  RegistrationProviderName,
} from '../../domain/registration-provider.types';
import { ChecklistItem } from '../../validation-engine/validation-engine.types';

/**
 * Andamiaje del puerto `RegistrationProvider` para una futura integración
 * directa con la API de SAYCO. Aún no implementado: SAYCO no expone hoy una
 * API pública de declaración de obras — esto requiere primero un acuerdo de
 * integración con la sociedad.
 */
@Injectable()
export class SaycoApiProvider implements RegistrationProvider {
  readonly name: RegistrationProviderName = 'sayco-api';

  prepareFile(registrationFileId: string, user: JwtPayload): Promise<RegistrationPreparationResult> {
    throw new NotImplementedException('SaycoApiProvider.prepareFile aún no está implementado');
  }

  generateDocuments(registrationFileId: string, user: JwtPayload): Promise<RegistrationGenerationResult> {
    throw new NotImplementedException('SaycoApiProvider.generateDocuments aún no está implementado');
  }

  generateChecklist(registrationFileId: string, user: JwtPayload): Promise<ChecklistItem[]> {
    throw new NotImplementedException('SaycoApiProvider.generateChecklist aún no está implementado');
  }

  markReadyForSubmission(registrationFileId: string, user: JwtPayload): Promise<RegistrationFile> {
    throw new NotImplementedException('SaycoApiProvider.markReadyForSubmission aún no está implementado');
  }

  submitToExternalSystem(registrationFileId: string, user: JwtPayload): Promise<never> {
    throw new NotImplementedException('Integración con la API de SAYCO pendiente de habilitar');
  }
}
