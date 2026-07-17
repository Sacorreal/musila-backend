export interface ExtractedFileMetadata {
  size: number;
  mimeType: string;
  fileName: string;
  /** Los siguientes campos solo están presentes si mimeType es audio/* o video/* (ffprobe corrió). */
  durationSeconds?: number;
  format?: string;
  bitRate?: number;
  sampleRate?: number;
  channels?: number;
  codec?: string;
  raw?: Record<string, any>;
}
