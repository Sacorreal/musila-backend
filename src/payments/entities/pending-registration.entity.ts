import { UserPlan } from 'src/users/entities/user-plan.enum';
import { UserRole } from 'src/users/entities/user-role.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum PendingRegistrationStatus {
  PENDING = 'pending',
  PAYMENT_CONFIRMED = 'payment_confirmed',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

@Entity({ name: 'pending_registrations' })
export class PendingRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { name: 'external_reference', unique: true })
  externalReference: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ type: 'enum', enum: UserPlan })
  plan: UserPlan;

  @Column({
    type: 'enum',
    enum: PendingRegistrationStatus,
    default: PendingRegistrationStatus.PENDING,
  })
  status: PendingRegistrationStatus;

  @Column('varchar', { name: 'user_id', nullable: true })
  userId?: string;

  @Column('timestamptz', { name: 'expires_at' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
