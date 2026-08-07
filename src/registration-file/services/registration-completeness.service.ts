import { Injectable } from '@nestjs/common';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { LegalProofService } from 'src/shared/legal-proof/legal-proof.service';
import { LegalEntityType } from 'src/shared/legal-proof/entities/legal-entity-type.enum';

import { RegistrationFile } from '../entities/registration-file.entity';
import { RegistrationFileService } from '../registration-file.service';
import { pickLatestDocumentPerType } from '../utils/latest-documents.util';
import { RegistrationProfileRegistry } from '../profiles/registration-profile.registry';
import { ValidationEngine } from '../validation-engine/validation-engine';
import { ChecklistItem, RegistrationFileSnapshot, ValidationResult } from '../validation-engine/validation-engine.types';

/**
 * Orquesta el Validation Engine para un expediente concreto: carga el
 * `RegistrationFile` (con sus relaciones), lo aplana a `RegistrationFileSnapshot`
 * y lo evalúa contra los perfiles activos. Es de solo lectura — no persiste
 * `status` ni `completenessSnapshot` (eso ocurre en `ManualRegistrationProvider`,
 * al preparar el expediente).
 */
@Injectable()
export class RegistrationCompletenessService {
  constructor(
    private readonly registrationFileService: RegistrationFileService,
    private readonly profileRegistry: RegistrationProfileRegistry,
    private readonly legalProofService: LegalProofService,
  ) {}

  async getCompleteness(id: string, user: JwtPayload): Promise<ValidationResult> {
    const registrationFile = await this.registrationFileService.findOne(id, user);
    return this.evaluate(registrationFile);
  }

  async getChecklist(id: string, user: JwtPayload): Promise<ChecklistItem[]> {
    const result = await this.getCompleteness(id, user);
    return result.checklist;
  }

  /** Reutilizable por `ManualRegistrationProvider` (Fase 5), que ya tiene el `RegistrationFile` cargado. */
  async evaluate(registrationFile: RegistrationFile): Promise<ValidationResult> {
    const snapshot = await this.buildSnapshot(registrationFile);
    const profiles = this.profileRegistry.getActiveProfiles(registrationFile.activeProfileKeys);
    const engine = new ValidationEngine(profiles);
    return engine.run(snapshot);
  }

  private async buildSnapshot(registrationFile: RegistrationFile): Promise<RegistrationFileSnapshot> {
    return {
      generalInfo: {
        title: registrationFile.title,
        alternativeTitles: registrationFile.alternativeTitles,
        language: registrationFile.language,
        genre: registrationFile.genre,
        ritmo: registrationFile.ritmo,
        durationSeconds: registrationFile.durationSeconds,
        creationDate: registrationFile.creationDate,
        creationPlace: registrationFile.creationPlace,
        workState: registrationFile.workState,
        version: registrationFile.version,
        description: registrationFile.description,
      },
      participants: (registrationFile.participants ?? []).map((participant) => ({
        role: participant.role,
        authorialPercentage: Number(participant.authorialPercentage),
        mechanicalPercentage: Number(participant.mechanicalPercentage),
        managementSociety: participant.managementSociety,
        saycoCode: participant.saycoCode,
      })),
      hasPublishingDeal: registrationFile.hasPublishingDeal,
      hasPublishingContract: !!registrationFile.publishingContract,
      phonogram: registrationFile.phonogramData,
      derivativeWork: registrationFile.derivativeWorkData,
      commissionedWork: registrationFile.commissionedWorkData,
      aiUsage: registrationFile.aiUsageData,
      documentTypesPresent: pickLatestDocumentPerType(registrationFile.documents ?? []).map((document) => document.documentType),
      trackAudioDurationSeconds: await this.resolveTrackAudioDurationSeconds(registrationFile.track.id),
    };
  }

  /**
   * Duración real del audio del track, reutilizando la metadata ya extraída
   * por `TrackLegalProofListener` (vía `music-metadata`) al crear el track —
   * evita volver a descargar/parsear el archivo solo para esta validación.
   * `null` si el track no tiene evidencia legal generada o el parseo falló.
   */
  private async resolveTrackAudioDurationSeconds(trackId: string): Promise<number | null> {
    const metadata = await this.legalProofService.findLatestMetadata(LegalEntityType.TRACK, trackId);
    return metadata?.durationSeconds ?? null;
  }
}
