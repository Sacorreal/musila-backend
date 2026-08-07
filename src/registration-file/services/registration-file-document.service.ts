import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { StorageService } from 'src/shared/storage/storage.service';
import { FileHashService } from 'src/shared/legal-proof/services/file-hash.service';
import { LegalProofService } from 'src/shared/legal-proof/legal-proof.service';
import { LegalEntityType } from 'src/shared/legal-proof/entities/legal-entity-type.enum';

import { RegistrationFileDocument } from '../entities/registration-file-document.entity';
import { RegistrationFileDocumentStatus } from '../entities/registration-file-document-status.enum';
import { RegistrationFileService } from '../registration-file.service';
import { AddRegistrationFileDocumentDto } from '../dto/add-registration-file-document.dto';

@Injectable()
export class RegistrationFileDocumentService {
  private readonly logger = new Logger(RegistrationFileDocumentService.name);

  constructor(
    @InjectRepository(RegistrationFileDocument)
    private readonly documentRepository: Repository<RegistrationFileDocument>,
    private readonly registrationFileService: RegistrationFileService,
    private readonly storageService: StorageService,
    private readonly fileHashService: FileHashService,
    private readonly legalProofService: LegalProofService,
  ) {}

  /**
   * Registra un documento ya subido a storage (flujo cliente→S3 vía presigned
   * URL, igual que el resto del proyecto). Cada re-subida de un mismo tipo
   * documental crea una fila nueva con `version` incrementada — no
   * sobreescribe, preservando el historial para trazabilidad.
   */
  async addDocument(
    registrationFileId: string,
    dto: AddRegistrationFileDocumentDto,
    user: JwtPayload,
  ): Promise<RegistrationFileDocument> {
    const registrationFile = await this.registrationFileService.findOne(registrationFileId, user);

    const existingVersions = await this.documentRepository.find({
      where: { registrationFile: { id: registrationFile.id }, documentType: dto.documentType },
    });
    const nextVersion = existingVersions.length ? Math.max(...existingVersions.map((d) => d.version)) + 1 : 1;

    const buffer = await this.storageService.downloadObject(dto.fileKey);
    const sha256Hash = await this.fileHashService.computeSha256(buffer);

    const document = this.documentRepository.create({
      registrationFile,
      documentType: dto.documentType,
      fileKey: dto.fileKey,
      fileUrl: dto.fileUrl,
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      fileSizeBytes: dto.fileSizeBytes,
      version: nextVersion,
      status: RegistrationFileDocumentStatus.CARGADO,
      sha256Hash,
      uploadedByUserId: user.id,
    });
    const saved = await this.documentRepository.save(document);

    await this.tryGenerateLegalProof(saved, buffer, user);

    return saved;
  }

  async removeDocument(registrationFileId: string, documentId: string, user: JwtPayload): Promise<void> {
    await this.registrationFileService.findOne(registrationFileId, user);

    const document = await this.documentRepository.findOne({
      where: { id: documentId, registrationFile: { id: registrationFileId } },
    });
    if (!document) throw new NotFoundException('El documento no existe en este expediente');

    // No se borra el archivo del storage: puede tener evidencia legal (LegalProof)
    // referenciándolo y/o versiones previas que deban conservarse para trazabilidad.
    await this.documentRepository.delete(document.id);
  }

  /** Evidencia legal (hash + timestamp) del documento — no bloquea el registro si falla. */
  private async tryGenerateLegalProof(
    document: RegistrationFileDocument,
    buffer: Buffer,
    user: JwtPayload,
  ): Promise<void> {
    try {
      const result = await this.legalProofService.generateProof({
        file: { buffer, fileName: document.fileName, mimeType: document.mimeType },
        metadataPayload: { size: document.fileSizeBytes, mimeType: document.mimeType, fileName: document.fileName },
        context: {
          entityType: LegalEntityType.REGISTRATION_FILE_DOCUMENT,
          entityId: document.id,
          requestedByUserId: user.id,
          sourceFileKey: document.fileKey,
        },
      });
      document.legalProofId = result.legalProofId;
      await this.documentRepository.save(document);
    } catch (error) {
      this.logger.error(`No se pudo generar evidencia legal para el documento ${document.id}`, error as Error);
    }
  }
}
