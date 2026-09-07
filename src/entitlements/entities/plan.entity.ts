import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PlanCapability } from './plan-capability.entity';
import { PlanEntitlement } from './plan-entitlement.entity';
import { PlanTier } from './plan-tier.enum';
import { SubjectType } from './subject-type.enum';

/** Producto comercial que agrupa capabilities y entitlements (§6). */
@Entity({ name: 'plans' })
export class Plan {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'AUTOR_FREE' })
  @Column('varchar', { length: 80, unique: true })
  key: string;

  @ApiProperty({ example: 'Autor Free' })
  @Column('varchar', { length: 150 })
  name: string;

  @ApiProperty({ required: false })
  @Column('text', { nullable: true })
  description?: string;

  @ApiProperty({ enum: SubjectType, example: SubjectType.USER })
  @Column('varchar', { name: 'subject_type', length: 20 })
  subjectType: SubjectType;

  @ApiProperty({ enum: PlanTier, example: PlanTier.FREE })
  @Column('varchar', { length: 20 })
  tier: PlanTier;

  @ApiProperty({ example: true })
  @Column('boolean', { name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => PlanCapability, (planCapability) => planCapability.plan)
  planCapabilities: PlanCapability[];

  @OneToMany(() => PlanEntitlement, (planEntitlement) => planEntitlement.plan)
  planEntitlements: PlanEntitlement[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
