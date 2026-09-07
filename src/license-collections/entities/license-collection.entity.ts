import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { LicenseContract } from 'src/license-contracts/entities/license-contract.entity';
import { CollectionStatus } from './collection-status.enum';
import { CollectionChannel } from './collection-channel.enum';

@Entity({ name: 'license_collections' })
export class LicenseCollection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => RequestedTrack, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requested_track_id' })
  requestedTrack: RequestedTrack;

  /** Solo presente para cuotas generadas desde un LicenseContract (flujo "generar en línea"). */
  @ManyToOne(() => LicenseContract, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'license_contract_id' })
  licenseContract: LicenseContract | null;

  @Column({ type: 'int', name: 'installment_number', default: 1 })
  installmentNumber: number;

  @Column({ type: 'varchar', name: 'payment_reference', nullable: true })
  paymentReference: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'timestamptz', name: 'due_date' })
  dueDate: Date;

  @Column({
    type: 'enum',
    enum: CollectionStatus,
    default: CollectionStatus.PENDIENTE,
  })
  status: CollectionStatus;

  @Column({ type: 'varchar', nullable: true, name: 'link_token' })
  linkToken: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'link_expires_at' })
  linkExpiresAt: Date | null;

  @Column({
    type: 'enum',
    enum: CollectionChannel,
    nullable: true,
    name: 'link_channel',
  })
  linkChannel: CollectionChannel | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'link_sent_at' })
  linkSentAt: Date | null;

  @Column({ type: 'int', default: 0, name: 'send_attempts' })
  sendAttempts: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_attempt_at' })
  lastAttemptAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'last_send_error' })
  lastSendError: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'paid_at' })
  paidAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'overdue_at' })
  overdueAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true, name: 'deleted_at' })
  deletedAt?: Date;
}
