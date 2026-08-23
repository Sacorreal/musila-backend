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
import { UserBankAccount } from 'src/users/entities/user.entity';

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

  /**
   * IPI de la editorial (CISAC), a nivel de organización: una publisher tiene
   * un único número IPI compartido por todo su roster, no uno por autor. Usado
   * por el Editorial Command Center para validar el Split Editorial.
   */
  @ApiProperty({ example: '00000000199', required: false })
  @Column('varchar', { name: 'ipi_number', length: 50, nullable: true })
  ipiNumber?: string;

  /**
   * Cuenta bancaria de la organización a la que se giran los retiros de su
   * wallet (ej. comisiones de publisher). Reutiliza la misma forma que la
   * cuenta bancaria de usuario; solo se persiste, nunca datos sensibles extra.
   */
  @Column('jsonb', { name: 'bank_account', nullable: true })
  bankAccount?: UserBankAccount;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
