export interface FileMetadataPayload {
  size: number;
  mimeType: string;
  fileName: string;
  /** Los siguientes campos solo aplican si mimeType es audio/* o video/*, extraídos por el llamador (p. ej. vía APIs nativas del navegador). */
  durationSeconds?: number;
  format?: string;
  bitRate?: number;
  sampleRate?: number;
  channels?: number;
  codec?: string;
}

export type ExtractedFileMetadata = FileMetadataPayload;
