import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from 'src/organizations/entities/organization.entity';

/**
 * Configuración global de comisión por publisher. El toggle
 * `commissionEnabled` es el "activar comisión por anticipo de licencia": cuando
 * está activo, la publisher cobra un porcentaje (definido por miembro del
 * roster en `PublisherRosterCommission`) sobre las licencias de sus autores.
 */
@Entity({ name: 'publisher_commission_policies' })
export class PublisherCommissionPolicy {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Column('uuid', { name: 'organization_id', unique: true })
  organizationId: string;

  @ApiProperty({ example: true })
  @Column('boolean', { name: 'commission_enabled', default: false })
  commissionEnabled: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
