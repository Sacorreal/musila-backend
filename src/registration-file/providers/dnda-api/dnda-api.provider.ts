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
 * directa con la API/ventanilla en línea de la DNDA. Aún no implementado:
 * requiere un acuerdo de integración con la entidad y verificar el
 * formulario oficial completo (ver riesgos del perfil `DndaRegistrationProfile`).
 */
@Injectable()
export class DndaApiProvider implements RegistrationProvider {
  readonly name: RegistrationProviderName = 'dnda-api';

  prepareFile(registrationFileId: string, user: JwtPayload): Promise<RegistrationPreparationResult> {
    throw new NotImplementedException('DndaApiProvider.prepareFile aún no está implementado');
  }

  generateDocuments(registrationFileId: string, user: JwtPayload): Promise<RegistrationGenerationResult> {
    throw new NotImplementedException('DndaApiProvider.generateDocuments aún no está implementado');
  }

  generateChecklist(registrationFileId: string, user: JwtPayload): Promise<ChecklistItem[]> {
    throw new NotImplementedException('DndaApiProvider.generateChecklist aún no está implementado');
  }

  markReadyForSubmission(registrationFileId: string, user: JwtPayload): Promise<RegistrationFile> {
    throw new NotImplementedException('DndaApiProvider.markReadyForSubmission aún no está implementado');
  }

  submitToExternalSystem(registrationFileId: string, user: JwtPayload): Promise<never> {
    throw new NotImplementedException('Integración con la API/ventanilla de la DNDA pendiente de habilitar');
  }
}
