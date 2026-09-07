import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingPeriod } from 'src/payments/entities/payment.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Plan } from './plan.entity';

/**
 * Precio configurable por el admin de Musila para un `Plan` (§Registro Legal
 * B2B, paso 3: "los precios de cada plan se configuran manualmente"). Fila
 * append-only versionada, mismo criterio que `TransactionFeeConfig`: la fila
 * vigente es la única con `isActive=true AND effectiveUntil IS NULL`; editar
 * un precio cierra la vigente (`effectiveUntil = now()`) e inserta una
 * nueva, preservando el historial. Un plan sin fila vigente = "plan sin
 * precio establecido" → dispara el flujo de validación manual de pago.
 */
@Entity({ name: 'plan_prices' })
@Index(['planId', 'currency', 'billingPeriod', 'isActive'])
export class PlanPrice {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Plan, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;

  @Column('uuid', { name: 'plan_id' })
  planId: string;

  @ApiProperty({ example: 'COP' })
  @Column('varchar', { length: 10 })
  currency: string;

  @ApiProperty({ example: 59900, description: 'Monto en centavos de la moneda' })
  @Column('int', { name: 'amount_in_cents' })
  amountInCents: number;

  @ApiProperty({ enum: BillingPeriod, example: BillingPeriod.MONTHLY })
  @Column({ type: 'varchar', length: 20, name: 'billing_period' })
  billingPeriod: BillingPeriod;

  @ApiProperty({ example: true })
  @Column('boolean', { name: 'is_active', default: true })
  isActive: boolean;

  @Column('timestamptz', { name: 'effective_from', default: () => 'now()' })
  effectiveFrom: Date;

  @ApiPropertyOptional()
  @Column('timestamptz', { name: 'effective_until', nullable: true })
  effectiveUntil?: Date | null;

  @ApiPropertyOptional()
  @Column('uuid', { name: 'created_by_user_id', nullable: true })
  createdByUserId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
