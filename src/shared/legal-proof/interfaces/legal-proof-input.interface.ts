import { LegalEntityType } from '../entities/legal-entity-type.enum';
import { FileMetadataPayload } from './file-metadata.interface';

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
  /**
   * Metadata del archivo (tamaño, mimeType, nombre y, para audio/video,
   * duración/bitrate/etc.) ya extraída por el llamador con un método nativo
   * (p. ej. las APIs de <audio>/<video> del navegador). Esta función no
   * inspecciona el buffer del archivo para obtenerla.
   */
  metadataPayload: FileMetadataPayload;
  context: LegalProofContext;
}
