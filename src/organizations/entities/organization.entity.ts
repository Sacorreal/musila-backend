import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrganizationType } from './organization-type.enum';
import { Tenant } from './tenant.entity';

/**
 * Cliente B2B (label, publisher, etc.). El tipo determina el universo de
 * capabilities que la organización puede utilizar (§20 del requerimiento),
 * pero no concede autorización por sí mismo.
 */
@Entity({ name: 'organizations' })
export class Organization {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Tenant, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column('uuid', { name: 'tenant_id', unique: true })
  tenantId: string;

  @ApiProperty({ example: 'Sony Music' })
  @Column('varchar', { length: 150 })
  name: string;

  @ApiProperty({ enum: OrganizationType, example: OrganizationType.LABEL })
  @Index()
  @Column('varchar', { length: 30 })
  type: OrganizationType;

  @ApiProperty({ example: 'sony-music' })
  @Column('varchar', { length: 100, unique: true })
  slug: string;

  @ApiProperty({ example: true })
  @Column('boolean', { name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
