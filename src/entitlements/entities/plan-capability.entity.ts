import { ApiProperty } from '@nestjs/swagger';
import { Capability } from 'src/authorization/entities/capability.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Plan } from './plan.entity';

/** Capability incluida en un plan comercial. */
@Entity({ name: 'plan_capabilities' })
@Unique(['planId', 'capabilityId'])
export class PlanCapability {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Plan, (plan) => plan.planCapabilities, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @Column('uuid', { name: 'plan_id' })
  planId: string;

  @ManyToOne(() => Capability, { nullable: false, onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'capability_id' })
  capability: Capability;

  @Column('uuid', { name: 'capability_id' })
  capabilityId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
