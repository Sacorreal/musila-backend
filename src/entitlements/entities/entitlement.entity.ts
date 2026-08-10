import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntitlementPeriod } from './entitlement-period.enum';
import { EntitlementScope } from './entitlement-scope.enum';
import { EntitlementType } from './entitlement-type.enum';

/**
 * Definición de un límite, cuota, recurso o feature contratable. Separa los
 * permisos funcionales (capabilities) de los límites comerciales (§7).
 */
@Entity({ name: 'entitlements' })
export class Entitlement {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'tracks.publish' })
  @Column('varchar', { length: 120, unique: true })
  key: string;

  @ApiProperty({ example: 'Publicación de tracks' })
  @Column('varchar', { length: 150 })
  name: string;

  @ApiProperty({ enum: EntitlementType, example: EntitlementType.QUOTA })
  @Column('varchar', { length: 20 })
  type: EntitlementType;

  @ApiProperty({ enum: EntitlementPeriod, example: EntitlementPeriod.LIFETIME })
  @Column('varchar', { name: 'default_period', length: 20, default: EntitlementPeriod.NONE })
  defaultPeriod: EntitlementPeriod;

  @ApiProperty({ enum: EntitlementScope, example: EntitlementScope.USER })
  @Column('varchar', { length: 20 })
  scope: EntitlementScope;

  @ApiProperty({ required: false })
  @Column('text', { nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
