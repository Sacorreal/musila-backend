import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StorageService } from 'src/shared/storage/storage.service';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { withTimeout } from 'src/shared/utils/with-timeout.util';
import { TimestampService } from 'src/shared/timestamp/timestamp.service';
import { LegalProof } from './entities/legal-proof.entity';
import { LegalProofStatus } from './entities/legal-proof-status.enum';
import { FileMetadataService } from './services/file-metadata.service';
import { FileHashService } from './services/file-hash.service';
import { LEGAL_PROOF_TIMEOUTS } from './constants/legal-proof.constants';
import { GenerateLegalProofInput } from './interfaces/legal-proof-input.interface';
import { GenerateLegalProofResult, LegalProofPartialError } from './interfaces/legal-proof-output.interface';
import { ExtractedFileMetadata } from './interfaces/file-metadata.interface';

@Injectable()
export class LegalProofService {
  private readonly logger = new Logger(LegalProofService.name);

  constructor(
    @InjectRepository(LegalProof) private readonly repo: Repository<LegalProof>,
    private readonly fileMetadataService: FileMetadataService,
    private readonly fileHashService: FileHashService,
    private readonly timestampService: TimestampService,
    private readonly storageService: StorageService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Función utilitaria global de evidencia legal: extrae metadata, calcula el
   * hash SHA-256, genera un sello de tiempo con OpenTimestamps y guarda el
   * .ots resultante en el storage existente. Reutilizable desde cualquier
   * módulo (publicación de tracks, firma de contratos, aceptación de coautoría).
   */
  async generateProof(input: GenerateLegalProofInput): Promise<GenerateLegalProofResult> {
    return withTimeout(
      this.run(input),
      LEGAL_PROOF_TIMEOUTS.TOTAL_PROCESS_MS,
      'legal-proof generation exceeded 30s timeout',
    );
  }

  private async run(input: GenerateLegalProofInput): Promise<GenerateLegalProofResult> {
    const { file, metadataPayload, context } = input;
    const processStartedAt = new Date();
    const errors: LegalProofPartialError[] = [];

    const metadata = this.extractMetadataOrAbort(file.fileName, metadataPayload, context);
    const sha256Hash = await this.fileHashService.computeSha256(file.buffer);
    const { otsKey, status } = await this.tryGenerateTimestamp(sha256Hash, context, errors);

    const processCompletedAt = new Date();

    const saved = await this.repo.save(
      this.repo.create({
        entityType: context.entityType,
        entityId: context.entityId,
        fileName: file.fileName,
        mimeType: file.mimeType,
        fileSizeBytes: String(metadata.size),
        sha256Hash,
        metadata: metadata as unknown as Record<string, any>,
        sourceFileKey: context.sourceFileKey ?? null,
        otsKey,
        status,
        errorMessage: errors.length ? errors[errors.length - 1].message : null,
        requestedByUserId: context.requestedByUserId ?? null,
        processStartedAt,
        processCompletedAt,
      }),
    );

    this.eventBus.emit('legal-proof.generated', {
      legalProofId: saved.id,
      entityType: context.entityType,
      entityId: context.entityId,
      sha256Hash,
      otsKey,
      status,
      occurredAt: processCompletedAt,
    });

    return {
      legalProofId: saved.id,
      entityType: context.entityType,
      entityId: context.entityId,
      metadata,
      sha256Hash,
      otsKey,
      otsStatus: status,
      processStartedAt,
      processCompletedAt,
      errors,
    };
  }

  private extractMetadataOrAbort(
    fileName: string,
    metadataPayload: GenerateLegalProofInput['metadataPayload'],
    context: GenerateLegalProofInput['context'],
  ): ExtractedFileMetadata {
    try {
      return this.fileMetadataService.extract(metadataPayload);
    } catch (error) {
      this.eventBus.emit('legal-proof.failed', {
        entityType: context.entityType,
        entityId: context.entityId,
        reason: (error as Error).message,
        occurredAt: new Date(),
      });
      throw new UnprocessableEntityException(
        `No fue posible procesar el archivo "${fileName}": ${(error as Error).message}`,
      );
    }
  }

  private async tryGenerateTimestamp(
    sha256Hash: string,
    context: GenerateLegalProofInput['context'],
    errors: LegalProofPartialError[],
  ): Promise<{ otsKey: string | null; status: LegalProofStatus }> {
    try {
      const { evidence } = await this.timestampService.createTimestamp(Buffer.from(sha256Hash, 'hex'));
      const uploadResult = await this.storageService.uploadBuffer({
        key: `legal-proofs/${context.entityType}/${context.entityId}/${sha256Hash}.ots`,
        buffer: evidence,
        contentType: 'application/octet-stream',
      });
      return { otsKey: uploadResult.key, status: LegalProofStatus.PENDING };
    } catch (error) {
      errors.push({ step: 'timestamp', message: (error as Error).message, occurredAt: new Date() });
      this.logger.error(
        `Timestamp falló para ${context.entityType}:${context.entityId} tras reintentos`,
        error as Error,
      );
      return { otsKey: null, status: LegalProofStatus.FAILED };
    }
  }
}
