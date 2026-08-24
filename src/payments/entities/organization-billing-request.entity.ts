import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum OrganizationBillingRequestStatus {
  /** Link de pago generado (o pendiente de precio manual), esperando confirmación. */
  PENDING = 'PENDING',
  /** Confirmado automáticamente por el webhook de Wompi. */
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  /** Plan sin precio (custom/free): el admin de Musila validó el pago/factura a mano. */
  MANUAL_CONFIRMED = 'MANUAL_CONFIRMED',
  /** El link de pago expiró sin confirmarse. */
  EXPIRED = 'EXPIRED',
  /** El pago fue rechazado por la pasarela. */
  FAILED = 'FAILED',
}

/**
 * Seguimiento del pago inicial de una organización B2B al ser aprobada
 * (§Registro Legal B2B, pasos 3-5). Equivalente B2B de
 * `PendingRegistration`, pero desacoplado de `User`/`UserPlanType` porque el
 * sujeto es una `Organization` y el plan es del modelo de entitlements
 * (`Plan`/`PlanPrice`), no `UserPlan`.
 */
@Entity({ name: 'organization_billing_requests' })
@Index(['organizationId', 'status'])
export class OrganizationBillingRequest {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'organization_id' })
  organizationId: string;

  @Column('uuid', { name: 'plan_id' })
  planId: string;

  @ApiProperty({ description: 'Referencia externa única enviada a Wompi (checkout/webhook)' })
  @Index({ unique: true })
  @Column('varchar', { name: 'external_reference', unique: true })
  externalReference: string;

  @ApiPropertyOptional({ description: 'URL del link/widget de pago, si el plan tiene precio configurado' })
  @Column('varchar', { name: 'payment_link_url', nullable: true })
  paymentLinkUrl?: string | null;

  @ApiPropertyOptional({ description: 'Monto a cobrar; null cuando el plan no tiene precio (flujo manual)' })
  @Column('int', { name: 'amount_in_cents', nullable: true })
  amountInCents?: number | null;

  @ApiProperty({ example: 'COP' })
  @Column('varchar', { length: 10, default: 'COP' })
  currency: string;

  @ApiProperty({ enum: OrganizationBillingRequestStatus, example: OrganizationBillingRequestStatus.PENDING })
  @Column({
    type: 'varchar',
    length: 20,
    default: OrganizationBillingRequestStatus.PENDING,
  })
  status: OrganizationBillingRequestStatus;

  @ApiPropertyOptional({ description: 'Fuente de pago tokenizada (pago automático recurrente)' })
  @Column('uuid', { name: 'payment_source_id', nullable: true })
  paymentSourceId?: string | null;

  @Column('timestamptz', { name: 'expires_at', nullable: true })
  expiresAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
