import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PromotionType } from './promotion-type.enum';
import { PromotionStatus } from './promotion-status.enum';
import { PromotionPaymentStatus } from './promotion-payment-status.enum';

/**
 * Pauta (destacado pagado) solicitada por una organización publisher para
 * destacar un track o el perfil de un compositor de su roster.
 *
 * Idempotencia/concurrencia: el índice único parcial `uq_promotion_live_target`
 * (creado en la migración sobre los estados "vivos") impide pautar dos veces el
 * mismo recurso al mismo destino. La doble aprobación se bloquea con un UPDATE
 * condicional por estado dentro de una transacción (`PromotionsService`).
 *
 * `targetId` referencia al track (`PromotionType.TRACK`) o al usuario-compositor
 * (`PromotionType.COMPOSER`); no lleva FK para preservar la pauta como registro
 * histórico aunque el recurso se elimine (requerimiento §FEATURES 5).
 */
@Entity({ name: 'promotions' })
@Index('idx_promotion_type_status', ['type', 'status'])
@Index('idx_promotion_organization', ['organizationId'])
export class Promotion {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ enum: PromotionType, example: PromotionType.TRACK })
  @Column('varchar', { length: 20 })
  type: PromotionType;

  /** UUID del track o del usuario-compositor destacado (sin FK, ver doc). */
  @ApiProperty()
  @Index()
  @Column('uuid', { name: 'target_id' })
  targetId: string;

  /** Organización publisher solicitante. */
  @ApiProperty()
  @Column('uuid', { name: 'organization_id' })
  organizationId: string;

  /** Usuario (miembro del publisher) que creó la solicitud. */
  @ApiProperty()
  @Column('uuid', { name: 'requested_by_user_id' })
  requestedByUserId: string;

  @ApiProperty({ enum: PromotionStatus, example: PromotionStatus.PENDING_PAYMENT })
  @Column('varchar', { length: 30, default: PromotionStatus.DRAFT })
  status: PromotionStatus;

  /** Snapshot del precio vigente al solicitar (no depende de cambios futuros). */
  @ApiProperty({ example: 50000 })
  @Column('numeric', { name: 'price_amount', precision: 12, scale: 2, default: 0 })
  priceAmount: number;

  @ApiProperty({ example: 'COP' })
  @Column('varchar', { length: 3, default: 'COP' })
  currency: string;

  @ApiProperty({ enum: PromotionPaymentStatus })
  @Column('varchar', { name: 'payment_status', length: 20, default: PromotionPaymentStatus.NONE })
  paymentStatus: PromotionPaymentStatus;

  /** Referencia de pago con la pasarela (correlaciona el webhook). */
  @ApiProperty({ required: false, nullable: true })
  @Index()
  @Column('varchar', { name: 'payment_reference', length: 100, nullable: true })
  paymentReference?: string | null;

  /** Fecha de inicio de la publicación (calculada al aprobar). */
  @ApiProperty({ required: false, nullable: true })
  @Column('timestamptz', { name: 'starts_at', nullable: true })
  startsAt?: Date | null;

  /** Fecha de expiración = startsAt + 15 días. */
  @ApiProperty({ required: false, nullable: true })
  @Column('timestamptz', { name: 'expires_at', nullable: true })
  expiresAt?: Date | null;

  @ApiProperty({ required: false, nullable: true })
  @Column('uuid', { name: 'approved_by_user_id', nullable: true })
  approvedByUserId?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Column('timestamptz', { name: 'approved_at', nullable: true })
  approvedAt?: Date | null;

  @ApiProperty({ required: false, nullable: true })
  @Column('text', { name: 'rejection_reason', nullable: true })
  rejectionReason?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Column('timestamptz', { name: 'withdrawn_at', nullable: true })
  withdrawnAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
