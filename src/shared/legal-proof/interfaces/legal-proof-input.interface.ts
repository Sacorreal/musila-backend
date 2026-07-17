import { LegalEntityType } from '../entities/legal-entity-type.enum';

export interface LegalProofFileInput {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}

export interface LegalProofContext {
  entityType: LegalEntityType;
  entityId: string;
  requestedByUserId?: string;
  /**
   * Key ya existente del archivo original en el storage (ej. track.audioKey),
   * solo para trazabilidad — esta función no sube el archivo original, solo el .ots.
   */
  sourceFileKey?: string;
}

export interface GenerateLegalProofInput {
  file: LegalProofFileInput;
  context: LegalProofContext;
}
