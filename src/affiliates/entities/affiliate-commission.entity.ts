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
import { UserRole } from 'src/users/entities/user-role.enum';
import { BillingPeriod } from 'src/payments/entities/payment.entity';
import { Affiliate } from './affiliate.entity';
import { AffiliateTier } from './affiliate-tier.enum';
import { AffiliateCommissionStatus } from './affiliate-commission-status.enum';
import { AffiliateCommissionType } from './affiliate-commission-type.enum';

@Index(['affiliateId', 'status'])
@Index(['referredUserId'])
@Entity({ name: 'affiliate_commissions' })
export class AffiliateCommission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Affiliate, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'affiliate_id' })
  affiliate: Affiliate;

  @Column('uuid', { name: 'affiliate_id' })
  affiliateId: string;

  @Column('uuid', { name: 'referred_user_id' })
  referredUserId: string;

  @Index({ unique: true })
  @Column('uuid', { name: 'payment_id' })
  paymentId: string;

  @Column('varchar', { name: 'external_reference', nullable: true })
  externalReference?: string;

  @Column({ type: 'enum', enum: AffiliateCommissionType, name: 'commission_type' })
  commissionType: AffiliateCommissionType;

  @Column({ type: 'enum', enum: AffiliateTier })
  tier: AffiliateTier;

  @Column('decimal', { precision: 5, scale: 2, name: 'commission_rate' })
  commissionRate: number;

  @Column('decimal', { precision: 12, scale: 2, name: 'sale_amount' })
  saleAmount: number;

  @Column('decimal', { precision: 12, scale: 2, name: 'commission_amount' })
  commissionAmount: number;

  @Column('varchar', { default: 'COP' })
  currency: string;

  @Column({
    type: 'enum',
    enum: AffiliateCommissionStatus,
    default: AffiliateCommissionStatus.PENDING,
  })
  status: AffiliateCommissionStatus;

  @Column({ type: 'enum', enum: UserRole, name: 'plan_role' })
  planRole: UserRole;

  @Column({ type: 'enum', enum: BillingPeriod, name: 'billing_period', nullable: true })
  billingPeriod?: BillingPeriod;

  @Column('boolean', { name: 'is_first_purchase' })
  isFirstPurchase: boolean;

  @Column('timestamptz', { name: 'approval_due_at' })
  approvalDueAt: Date;

  @Column('timestamptz', { name: 'approved_at', nullable: true })
  approvedAt?: Date;

  @Column('timestamptz', { name: 'paid_at', nullable: true })
  paidAt?: Date;

  @Column('timestamptz', { name: 'rejected_at', nullable: true })
  rejectedAt?: Date;

  @Column('varchar', { name: 'rejection_reason', nullable: true })
  rejectionReason?: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
