import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { LicenseContract } from 'src/license-contracts/entities/license-contract.entity';
import { BankInformationRequestStatus, BankInformationCompletionReason } from './bank-information-request-status.enum';

/**
 * Registro de control por (usuario, contrato de licencia): rastrea si un
 * participante del Split ya fue notificado/completó el registro de
 * información bancaria para ese evento de anticipo. Si el usuario ya tenía
 * `UserBankInformation` configurada, la fila se crea directamente
 * `COMPLETED` (razón `already_configured`) y no se notifica de nuevo — así
 * "una vez por usuario" se cumple sin pedirle reconfigurar en cada venta.
 */
@Entity({ name: 'bank_information_requests' })
@Unique('UQ_bank_info_request_user_contract', ['user', 'licenseContract'])
@Index('IDX_bank_info_request_user_status', ['user', 'status'])
export class BankInformationRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => LicenseContract, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'license_contract_id' })
  licenseContract: LicenseContract;

  /** Denormalizado para notificaciones/listados sin joins extra. */
  @Column({ type: 'varchar', name: 'track_title' })
  trackTitle: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, name: 'advance_amount' })
  advanceAmount: number;

  @Column({
    type: 'enum',
    enum: BankInformationRequestStatus,
    default: BankInformationRequestStatus.PENDING,
  })
  status: BankInformationRequestStatus;

  @Column({
    type: 'enum',
    enum: BankInformationCompletionReason,
    name: 'completion_reason',
    nullable: true,
  })
  completionReason: BankInformationCompletionReason | null;

  @Column({ type: 'timestamptz', name: 'completed_at', nullable: true })
  completedAt: Date | null;

  // Mismo patrón de reintentos que WalletWithdrawal / WalletNotificationService.
  @Column({ type: 'int', name: 'notification_attempts', default: 0 })
  notificationAttempts: number;

  @Column({ type: 'text', name: 'notification_last_error', nullable: true })
  notificationLastError: string | null;

  @Column({ type: 'timestamptz', name: 'notified_at', nullable: true })
  notifiedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
