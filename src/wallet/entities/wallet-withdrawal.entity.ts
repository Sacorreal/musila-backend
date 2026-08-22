import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User, UserBankAccount } from 'src/users/entities/user.entity';
import { Organization } from 'src/organizations/entities/organization.entity';
import { WalletWithdrawalStatus } from './wallet-withdrawal-status.enum';
import { WalletWithdrawalOrigin } from './wallet-withdrawal-origin.enum';

/**
 * Solicitud de retiro de fondos. El titular es un `User` (autor) o una
 * `Organization` (publisher retirando comisiones); exactamente uno de los dos
 * está presente (CHECK en DB). El flujo de estados y aprobación admin es común.
 * Desde `origin=scheduled` la solicitud ya no la crea el usuario: la genera el
 * cron de pago semanal (todos los lunes) por el saldo disponible completo.
 */
@Entity({ name: 'wallet_withdrawals' })
@Index('IDX_wallet_withdrawal_user_status', ['user', 'status'])
export class WalletWithdrawal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @ManyToOne(() => Organization, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'beneficiary_organization_id' })
  @Index()
  beneficiaryOrganization: Organization | null;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  amount: number;

  @Column('varchar', { length: 3, default: 'COP' })
  currency: string;

  @Column({
    type: 'enum',
    enum: WalletWithdrawalStatus,
    default: WalletWithdrawalStatus.PENDING,
  })
  @Index()
  status: WalletWithdrawalStatus;

  @Column({ type: 'jsonb', name: 'bank_account_snapshot' })
  bankAccountSnapshot: UserBankAccount;

  @Column({
    type: 'enum',
    enum: WalletWithdrawalOrigin,
    default: WalletWithdrawalOrigin.MANUAL,
  })
  origin: WalletWithdrawalOrigin;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'processed_by_admin_id' })
  processedByAdmin: User | null;

  @Column({ type: 'text', name: 'rejection_reason', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'timestamptz', name: 'in_process_at', nullable: true })
  inProcessAt: Date | null;

  @Column({ type: 'timestamptz', name: 'paid_at', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'timestamptz', name: 'rejected_at', nullable: true })
  rejectedAt: Date | null;

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
