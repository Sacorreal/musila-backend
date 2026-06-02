import { User } from 'src/users/entities/user.entity';
import { UserPlan } from 'src/users/entities/user-plan.enum';
import { UserRole } from 'src/users/entities/user-role.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum PaymentStatus {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PENDING = 'pending',
  CANCELLED = 'cancelled',
}

export enum PaymentType {
  SUBSCRIPTION = 'subscription',
  ONE_TIME = 'one_time',
}

@Entity({ name: 'payments' })
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  user?: User;

  @Column('varchar', { name: 'user_id', nullable: true })
  userId?: string;

  @Column('varchar', { name: 'mp_payment_id', nullable: true })
  mercadoPagoPaymentId?: string;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column('decimal', { precision: 12, scale: 2, nullable: true })
  amount?: number;

  @Column('varchar', { default: 'COP' })
  currency: string;

  @Column({ type: 'enum', enum: UserPlan, name: 'plan_type' })
  planType: UserPlan;

  @Column({ type: 'enum', enum: UserRole, name: 'role_type' })
  roleType: UserRole;

  @Column({ type: 'enum', enum: PaymentType, name: 'payment_type' })
  paymentType: PaymentType;

  @Column('varchar', { name: 'external_reference', nullable: true })
  externalReference?: string;

  @Column('timestamptz', { name: 'expires_at', nullable: true })
  expiresAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
