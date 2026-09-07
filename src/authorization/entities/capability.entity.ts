import { ApiProperty } from '@nestjs/swagger';
import { OrganizationType } from 'src/organizations/entities/organization-type.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CapabilityAction } from './capability-action.enum';
import { CapabilityScope } from './capability-scope.enum';
import { CapabilitySubject } from './capability-subject.enum';

/**
 * Entrada del catálogo global de capabilities (MATRIZ DE CAPACIDADES),
 * fuente de verdad del sistema de autorización. Solo Musila crea
 * capabilities; las organizaciones únicamente las seleccionan para
 * construir roles propios (§2 del requerimiento).
 */
@Entity({ name: 'capabilities' })
export class Capability {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'roster.view' })
  @Column('varchar', { length: 120, unique: true })
  key: string;

  @ApiProperty({ example: 'Ver roster' })
  @Column('varchar', { length: 150 })
  name: string;

  @ApiProperty({ example: 'Permite consultar los miembros del roster de la organización' })
  @Column('varchar', { length: 500 })
  description: string;

  @ApiProperty({ example: 'ROSTER' })
  @Index()
  @Column('varchar', { length: 50 })
  domain: string;

  @ApiProperty({ example: 'roster_member' })
  @Column('varchar', { length: 80 })
  resource: string;

  @ApiProperty({ enum: CapabilityAction, example: CapabilityAction.VIEW })
  @Column('varchar', { length: 20 })
  action: CapabilityAction;

  @ApiProperty({ enum: CapabilitySubject, isArray: true })
  @Column('text', { name: 'assignable_to', array: true, default: '{}' })
  assignableTo: CapabilitySubject[];

  @ApiProperty({ enum: CapabilityScope, isArray: true })
  @Column('text', { name: 'allowed_scopes', array: true, default: '{}' })
  allowedScopes: CapabilityScope[];

  /** Tipos de organización donde aplica; vacío = disponible para todos los tipos. */
  @ApiProperty({ enum: OrganizationType, isArray: true })
  @Column('text', { name: 'organization_types', array: true, default: '{}' })
  organizationTypes: OrganizationType[];

  @ApiProperty({ example: true })
  @Column('boolean', { name: 'is_system', default: true })
  isSystem: boolean;

  @ApiProperty({ example: true })
  @Column('boolean', { name: 'is_active', default: true })
  isActive: boolean;

  @ApiProperty({ example: 1 })
  @Column('int', { default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
