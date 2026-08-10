import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantType } from './tenant-type.enum';

/**
 * Unidad de aislamiento del sistema de autorización. Existe un único tenant
 * PLATFORM (`musila`, staff interno) y un tenant ORGANIZATION por cada
 * cliente B2B.
 */
@Entity({ name: 'tenants' })
export class Tenant {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ enum: TenantType, example: TenantType.ORGANIZATION })
  @Column('varchar', { length: 30 })
  type: TenantType;

  @ApiProperty({ example: 'sony-music' })
  @Column('varchar', { length: 100, unique: true })
  slug: string;

  @ApiProperty({ example: 'Sony Music' })
  @Column('varchar', { length: 150 })
  name: string;

  @ApiProperty({ example: true })
  @Column('boolean', { name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
