import { ApiProperty } from '@nestjs/swagger';
import { Track } from 'src/tracks/entities/track.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CertificateRecipient } from './certificate-recipient.entity';
import { CertificateStatus } from './certificate-status.enum';

export interface CertificateTrackSnapshot {
  trackId: string;
  title: string;
  genre: string;
  ritmo: string | null;
  publishedAt: string;
}

/**
 * Certificado de Autoría emitido automáticamente al publicar una canción.
 * Relación 1:1 real con `Track` (a diferencia de `LegalProof`, que es
 * polimórfica): un certificado siempre pertenece a exactamente una
 * canción, sin reutilización cross-módulo del concepto.
 */
@Entity({ name: 'certificate' })
export class Certificate {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'registry_number', unique: true, length: 40 })
  registryNumber: string;

  @OneToOne(() => Track, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track: Track;

  @Column({
    type: 'enum',
    enum: CertificateStatus,
    enumName: 'certificate_status_enum',
    default: CertificateStatus.PENDING,
  })
  status: CertificateStatus;

  @Column({ type: 'varchar', name: 'document_key', nullable: true })
  documentKey: string | null;

  @Column({ type: 'text', name: 'document_url', nullable: true })
  documentUrl: string | null;

  /** Snapshot de los datos de la obra al momento de emisión — el certificado no cambia si el track se edita después. */
  @Column({ type: 'jsonb', name: 'track_snapshot' })
  trackSnapshot: CertificateTrackSnapshot;

  @Column({ type: 'smallint', name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'uuid', name: 'requested_by_user_id', nullable: true })
  requestedByUserId: string | null;

  @OneToMany(() => CertificateRecipient, (recipient) => recipient.certificate, { cascade: true })
  recipients: CertificateRecipient[];

  @Column({ type: 'timestamptz', name: 'issued_at', nullable: true })
  issuedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
