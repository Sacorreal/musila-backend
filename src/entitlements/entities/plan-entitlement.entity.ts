import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Entitlement } from './entitlement.entity';
import { EntitlementPeriod } from './entitlement-period.enum';
import { Plan } from './plan.entity';

/** Valor concreto (límite/ilimitado/período) de un entitlement dentro de un plan. */
@Entity({ name: 'plan_entitlements' })
@Unique(['planId', 'entitlementId'])
export class PlanEntitlement {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Plan, (plan) => plan.planEntitlements, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @Column('uuid', { name: 'plan_id' })
  planId: string;

  @ManyToOne(() => Entitlement, { nullable: false, onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'entitlement_id' })
  entitlement: Entitlement;

  @Column('uuid', { name: 'entitlement_id' })
  entitlementId: string;

  /** null cuando `unlimited` es true. */
  @ApiProperty({ example: 5, required: false, nullable: true })
  @Column('int', { nullable: true })
  limit: number | null;

  @ApiProperty({ example: false })
  @Column('boolean', { default: false })
  unlimited: boolean;

  @ApiProperty({ enum: EntitlementPeriod, example: EntitlementPeriod.LIFETIME })
  @Column('varchar', { length: 20 })
  period: EntitlementPeriod;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
