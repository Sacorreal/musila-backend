import { BadRequestException, Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { LegalProofService } from 'src/shared/legal-proof/legal-proof.service';
import { LegalEntityType } from 'src/shared/legal-proof/entities/legal-entity-type.enum';

import { RegistrationFile } from '../../entities/registration-file.entity';
import { RegistrationFileStatus } from '../../entities/registration-file-status.enum';
import { RegistrationFileService } from '../../registration-file.service';
import { RegistrationCompletenessService } from '../../services/registration-completeness.service';
import { RegistrationFileGenerationService } from '../../services/registration-file-generation.service';
import { RegistrationProvider } from '../../domain/registration-provider.interface';
import {
  RegistrationGenerationResult,
  RegistrationPreparationResult,
  RegistrationProviderName,
} from '../../domain/registration-provider.types';
import { ChecklistItem } from '../../validation-engine/validation-engine.types';

/**
 * Único proveedor funcional de esta entrega: prepara el expediente, genera
 * su PDF/ZIP y lo deja listo para que el propio usuario lo presente
 * manualmente ante SAYCO/DNDA. Nunca envía nada a un sistema externo
 * (`submitToExternalSystem` no está soportado).
 */
@Injectable()
export class ManualRegistrationProvider implements RegistrationProvider {
  private readonly logger = new Logger(ManualRegistrationProvider.name);
  readonly name: RegistrationProviderName = 'manual';

  constructor(
    @InjectRepository(RegistrationFile)
    private readonly registrationFileRepository: Repository<RegistrationFile>,
    private readonly registrationFileService: RegistrationFileService,
    private readonly completenessService: RegistrationCompletenessService,
    private readonly generationService: RegistrationFileGenerationService,
    private readonly legalProofService: LegalProofService,
    private readonly eventBus: EventBusService,
  ) {}

  async prepareFile(registrationFileId: string, user: JwtPayload): Promise<RegistrationPreparationResult> {
    const registrationFile = await this.registrationFileService.findOne(registrationFileId, user);
    const validation = await this.completenessService.evaluate(registrationFile);

    const previousStatus = registrationFile.status;
    registrationFile.status = validation.status;
    registrationFile.completenessSnapshot = {
      overallPercentage: validation.overallPercentage,
      calculatedAt: new Date().toISOString(),
    };
    const saved = await this.registrationFileRepository.save(registrationFile);

    if (previousStatus !== saved.status) {
      this.eventBus.emit('registration-file.status-changed', {
        registrationFileId: saved.id,
        trackId: saved.track.id,
        caseNumber: saved.caseNumber,
        previousStatus,
        status: saved.status,
      });
    }

    return { registrationFile: saved, validation };
  }

  async generateChecklist(registrationFileId: string, user: JwtPayload): Promise<ChecklistItem[]> {
    const { validation } = await this.prepareFile(registrationFileId, user);
    return validation.checklist;
  }

  async generateDocuments(registrationFileId: string, user: JwtPayload): Promise<RegistrationGenerationResult> {
    const { registrationFile, validation } = await this.prepareFile(registrationFileId, user);
    const result = await this.generationService.generate(registrationFile, validation);

    registrationFile.generatedPdfKey = result.pdfKey;
    registrationFile.generatedPdfUrl = result.pdfUrl;
    registrationFile.generatedZipKey = result.zipKey;
    registrationFile.generatedZipUrl = result.zipUrl;
    registrationFile.generatedAt = new Date();
    await this.registrationFileRepository.save(registrationFile);

    this.eventBus.emit('registration-file.generated', {
      registrationFileId: registrationFile.id,
      caseNumber: registrationFile.caseNumber,
      pdfUrl: result.pdfUrl,
      zipUrl: result.zipUrl,
    });

    return result;
  }

  async markReadyForSubmission(registrationFileId: string, user: JwtPayload): Promise<RegistrationFile> {
    const { registrationFile, validation } = await this.prepareFile(registrationFileId, user);

    if (validation.status !== RegistrationFileStatus.LISTO_PARA_PRESENTAR) {
      throw new BadRequestException({
        message: 'El expediente todavía no está listo para presentar',
        errors: validation.errors,
        overallPercentage: validation.overallPercentage,
      });
    }

    await this.generateDocuments(registrationFileId, user);
    await this.tryGenerateExpedienteLegalProof(registrationFile, user);

    return this.registrationFileService.findOne(registrationFileId, user);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  submitToExternalSystem(registrationFileId: string, user: JwtPayload): Promise<never> {
    throw new NotImplementedException(
      'Musila prepara el expediente para presentación manual; el envío automatizado no está soportado',
    );
  }

  /** Evidencia legal (hash + timestamp) del expediente listo para presentar — no bloquea si falla. */
  private async tryGenerateExpedienteLegalProof(registrationFile: RegistrationFile, user: JwtPayload): Promise<void> {
    const snapshot = {
      event: 'registration-file.ready-for-submission',
      registrationFileId: registrationFile.id,
      caseNumber: registrationFile.caseNumber,
      activeProfileKeys: registrationFile.activeProfileKeys,
      readyAt: new Date().toISOString(),
    };
    const buffer = Buffer.from(JSON.stringify(snapshot));
    const fileName = `registration-file-${registrationFile.id}.json`;

    try {
      await this.legalProofService.generateProof({
        file: { buffer, fileName, mimeType: 'application/json' },
        metadataPayload: { size: buffer.length, mimeType: 'application/json', fileName },
        context: {
          entityType: LegalEntityType.REGISTRATION_FILE,
          entityId: registrationFile.id,
          requestedByUserId: user.id,
        },
      });
    } catch (error) {
      this.logger.error(`No se pudo generar evidencia legal para el expediente ${registrationFile.id}`, error as Error);
    }
  }
}
