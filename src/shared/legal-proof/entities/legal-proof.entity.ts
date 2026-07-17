import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LegalProofStatus } from './legal-proof-status.enum';

/**
 * Tabla polimórfica de evidencia legal (hash + metadata + timestamp OTS).
 * `entityType`/`entityId` no tienen FK física (mismo patrón que audit_log):
 * cualquier módulo llamante (tracks, requested-tracks, futuros contratos o
 * coautoría) referencia su propio id sin acoplamiento físico en la base.
 */
@Index('IDX_legal_proofs_entity', ['entityType', 'entityId'])
@Index('IDX_legal_proofs_hash', ['sha256Hash'])
@Entity({ name: 'legal_proofs' })
export class LegalProof {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { name: 'entity_type', length: 50 })
  entityType: string;

  @Column('uuid', { name: 'entity_id' })
  entityId: string;

  @Column('varchar', { name: 'file_name' })
  fileName: string;

  @Column('varchar', { name: 'mime_type', length: 150 })
  mimeType: string;

  @Column('bigint', { name: 'file_size_bytes' })
  fileSizeBytes: string;

  @Column('char', { name: 'sha256_hash', length: 64 })
  sha256Hash: string;

  @Column('jsonb', { nullable: true })
  metadata?: Record<string, any> | null;

  @Column('varchar', { name: 'source_file_key', nullable: true })
  sourceFileKey?: string | null;

  @Column('varchar', { name: 'ots_key', nullable: true })
  otsKey?: string | null;

  @Column({
    type: 'enum',
    enum: LegalProofStatus,
    enumName: 'legal_proofs_status_enum',
    default: LegalProofStatus.PENDING,
  })
  status: LegalProofStatus;

  @Column('smallint', { name: 'retry_count', default: 0 })
  retryCount: number;

  @Column('text', { name: 'error_message', nullable: true })
  errorMessage?: string | null;

  @Column('uuid', { name: 'requested_by_user_id', nullable: true })
  requestedByUserId?: string | null;

  @Column('timestamptz', { name: 'process_started_at' })
  processStartedAt: Date;

  @Column('timestamptz', { name: 'process_completed_at', nullable: true })
  processCompletedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
