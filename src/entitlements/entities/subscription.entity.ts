import { ApiProperty } from '@nestjs/swagger';
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
import { Plan } from './plan.entity';
import { SubjectType } from './subject-type.enum';
import { SubscriptionStatus } from './subscription-status.enum';

/**
 * Contratación de un plan por un sujeto (usuario, organización o
 * trackspace). Regla B2B (§6): la organización paga la subscription; los
 * miembros del roster no necesitan una individual.
 */
@Entity({ name: 'subscriptions' })
@Index(['subjectType', 'subjectId', 'status'])
export class Subscription {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ enum: SubjectType, example: SubjectType.USER })
  @Column('varchar', { name: 'subject_type', length: 20 })
  subjectType: SubjectType;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Column('uuid', { name: 'subject_id' })
  subjectId: string;

  @ManyToOne(() => Plan, { nullable: false, onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @Column('uuid', { name: 'plan_id' })
  planId: string;

  @ApiProperty({ enum: SubscriptionStatus, example: SubscriptionStatus.ACTIVE })
  @Column('varchar', { length: 20, default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  @ApiProperty()
  @Column('timestamptz', { name: 'start_at' })
  startAt: Date;

  @ApiProperty({ required: false, nullable: true })
  @Column('timestamptz', { name: 'end_at', nullable: true })
  endAt?: Date | null;

  @ApiProperty({ example: 'wompi', required: false })
  @Column('varchar', { name: 'billing_provider', length: 40, nullable: true })
  billingProvider?: string;

  @ApiProperty({ required: false })
  @Column('varchar', { name: 'billing_reference', length: 255, nullable: true })
  billingReference?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
