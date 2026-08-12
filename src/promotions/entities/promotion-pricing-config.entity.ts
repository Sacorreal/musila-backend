import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PromotionType } from './promotion-type.enum';

/**
 * Precio configurable por tipo de pauta (TRACK/COMPOSER), gestionado por el
 * superadmin desde la UI sin tocar código (requerimiento §REQUIREMENTS).
 *
 * Réplica del patrón append-only versionado de `TransactionFeeConfig`: al
 * cambiar un precio se cierra la fila vigente (`effectiveUntil = now`,
 * `isActive = false`) y se inserta una nueva. La fila vigente de un tipo es la
 * que cumple `isActive = true AND effectiveUntil IS NULL`. Las pautas ya
 * solicitadas conservan su propio snapshot y no dependen de esta tabla.
 */
@Entity({ name: 'promotion_pricing_config' })
@Index(['type', 'isActive'])
export class PromotionPricingConfig {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ enum: PromotionType, example: PromotionType.TRACK })
  @Column('varchar', { length: 20 })
  type: PromotionType;

  /** Precio del tipo de pauta en la moneda del modelo (COP). */
  @ApiProperty({ example: 50000 })
  @Column('numeric', { precision: 12, scale: 2 })
  amount: number;

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

  /** Actor (staff) que creó esta versión. Sin FK para sobrevivir a su borrado. */
  @ApiProperty({ required: false, nullable: true })
  @Column('uuid', { name: 'created_by_user_id', nullable: true })
  createdByUserId?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Column('varchar', { name: 'created_by_name', length: 150, nullable: true })
  createdByName?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
