import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Certificate } from './certificate.entity';
import { CertificateRecipientStatus } from './certificate-recipient-status.enum';

/**
 * Un `CertificateRecipient` por autor de la canción. Guarda un snapshot
 * inmutable de los datos impresos en la fila 1 del PDF (no cambia aunque
 * el usuario edite su perfil después) y el estado de envío del correo
 * por destinatario, análogo a `LicenseContractSignatory`.
 */
@Entity({ name: 'certificate_recipient' })
@Unique('UQ_certificate_recipient_user', ['certificate', 'userId'])
export class CertificateRecipient {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Certificate, (certificate) => certificate.recipients, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'certificate_id' })
  certificate: Certificate;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', name: 'full_name' })
  fullName: string;

  @Column({ type: 'varchar' })
  email: string;

  @Column({ type: 'varchar', name: 'type_citizen_id', nullable: true })
  typeCitizenId: string | null;

  @Column({ type: 'varchar', name: 'citizen_id', nullable: true })
  citizenId: string | null;

  @Column({ type: 'varchar', name: 'musila_creator_id', nullable: true })
  username: string | null;

  @Column({
    type: 'enum',
    enum: CertificateRecipientStatus,
    enumName: 'certificate_recipient_status_enum',
    default: CertificateRecipientStatus.PENDING,
  })
  status: CertificateRecipientStatus;

  @Column({ type: 'smallint', name: 'send_attempts', default: 0 })
  sendAttempts: number;

  @Column({ type: 'text', name: 'last_error', nullable: true })
  lastError: string | null;

  @Column({ type: 'timestamptz', name: 'sent_at', nullable: true })
  sentAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
