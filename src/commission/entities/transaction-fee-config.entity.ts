import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Entitlement } from '../../entitlements/entities/entitlement.entity';
import { Plan } from '../../entitlements/entities/plan.entity';
import { OrganizationType } from '../../organizations/entities/organization-type.enum';

/**
 * Valor concreto y versionado del entitlement `marketplace.transaction_fee`
 * para una combinación (plan, tipo de organización). El porcentaje del plan no
 * puede vivir en `PlanEntitlement` porque este es único por (plan, entitlement)
 * y aquí la tarifa varía por `organizationType` (LABEL vs MANAGEMENT) y debe
 * conservar historial de vigencia (§21).
 *
 * La tabla es append-only para el historial: al modificar una tarifa se cierra
 * la fila vigente (`effectiveUntil = now`, `isActive = false`) y se inserta una
 * nueva. La fila vigente de una combinación es la que cumple
 * `isActive = true AND effectiveUntil IS NULL`. Los Deals ya formalizados no
 * dependen de esta configuración: conservan su propio snapshot.
 */
@Entity({ name: 'transaction_fee_config' })
@Index(['planId', 'organizationType', 'isActive'])
export class TransactionFeeConfig {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Plan, { nullable: false, onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @Column('uuid', { name: 'plan_id' })
  planId: string;

  @ManyToOne(() => Entitlement, { nullable: false, onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'entitlement_id' })
  entitlement: Entitlement;

  @Column('uuid', { name: 'entitlement_id' })
  entitlementId: string;

  @ApiProperty({ enum: OrganizationType, example: OrganizationType.LABEL })
  @Column('varchar', { name: 'organization_type', length: 30 })
  organizationType: OrganizationType;

  /** Porcentaje sobre el valor de la licencia (0-100). NUMERIC(5,2): p. ej. 7.50. */
  @ApiProperty({ example: 8 })
  @Column('numeric', { precision: 5, scale: 2 })
  rate: number;

  @ApiProperty({ example: 'COP' })
  @Column('varchar', { length: 3, default: 'COP' })
  currency: string;

  @ApiProperty({ example: true })
  @Column('boolean', { name: 'is_active', default: true })
  isActive: boolean;

  @ApiProperty()
  @Column('timestamptz', { name: 'effective_from', default: () => 'now()' })
  effectiveFrom: Date;

  @ApiProperty({ required: false, nullable: true })
  @Column('timestamptz', { name: 'effective_until', nullable: true })
  effectiveUntil?: Date | null;

  /** Actor (staff de Musila) que creó esta versión. Sin FK para sobrevivir a un hard-delete del actor. */
  @ApiProperty({ required: false, nullable: true })
  @Column('uuid', { name: 'created_by_user_id', nullable: true })
  createdByUserId?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Column('varchar', { name: 'created_by_name', length: 150, nullable: true })
  createdByName?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
