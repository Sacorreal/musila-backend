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
import { WalletWithdrawalStatus } from './wallet-withdrawal-status.enum';

@Entity({ name: 'wallet_withdrawals' })
@Index('IDX_wallet_withdrawal_user_status', ['user', 'status'])
export class WalletWithdrawal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

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
