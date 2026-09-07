import { LegalProofStatus } from '../entities/legal-proof-status.enum';
import { ExtractedFileMetadata } from './file-metadata.interface';

export interface LegalProofPartialError {
  step: 'metadata' | 'hash' | 'timestamp' | 'storage';
  message: string;
  occurredAt: Date;
}

export interface GenerateLegalProofResult {
  legalProofId: string;
  entityType: string;
  entityId: string;
  metadata: ExtractedFileMetadata;
  sha256Hash: string;
  otsKey: string | null;
  otsStatus: LegalProofStatus;
  processStartedAt: Date;
  processCompletedAt: Date;
  errors: LegalProofPartialError[];
}
