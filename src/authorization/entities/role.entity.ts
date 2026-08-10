import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from 'src/organizations/entities/tenant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { RoleCapability } from './role-capability.entity';
import { RoleSource } from './role-source.enum';
import { RoleType } from './role-type.enum';

/**
 * Rol tenant-aware. Los roles SYSTEM pertenecen al tenant MUSILA y actúan
 * como plantillas compartidas (no editables por organizaciones); los roles
 * CUSTOM pertenecen exclusivamente al tenant que los creó (§3 y §11).
 */
@Entity({ name: 'roles' })
@Unique(['tenantId', 'name', 'type'])
@Index(['tenantId', 'type'])
export class Role {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column('uuid', { name: 'tenant_id' })
  tenantId: string;

  @ApiProperty({ enum: RoleType, example: RoleType.ORGANIZATION })
  @Column('varchar', { length: 20 })
  type: RoleType;

  @ApiProperty({ enum: RoleSource, example: RoleSource.CUSTOM })
  @Column('varchar', { length: 20, default: RoleSource.CUSTOM })
  source: RoleSource;

  /** Clave estable solo para roles SYSTEM (ej. 'SUPER_ADMIN', 'AUTOR'). */
  @ApiProperty({ example: 'SUPER_ADMIN', required: false })
  @Column('varchar', { length: 60, nullable: true })
  key?: string;

  @ApiProperty({ example: 'A&R Manager' })
  @Column('varchar', { length: 100 })
  name: string;

  @ApiProperty({ example: 'Gestiona el roster y las campañas', required: false })
  @Column('text', { nullable: true })
  description?: string;

  @ApiProperty({ example: true })
  @Column('boolean', { name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => RoleCapability, (roleCapability) => roleCapability.role)
  roleCapabilities: RoleCapability[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
