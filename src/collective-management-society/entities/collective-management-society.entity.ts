import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CollectiveManagementSocietyOrganizationType } from './collective-management-society-organization-type.enum';
import { CollectiveManagementSocietyStatus } from './collective-management-society-status.enum';

/**
 * Catálogo maestro controlado de sociedades de gestión colectiva (CMO/PRO).
 * Nunca se elimina en duro (`SocietyAffiliation` y `WorkSocietyAffiliationSnapshot`
 * la referencian): "retirar" una sociedad se hace marcando `status = DEPRECATED`.
 */
@Entity({ name: 'collective_management_societies' })
@Index(['isoCountryCode'])
@Index(['status'])
export class CollectiveManagementSociety {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Sociedad de Autores y Compositores de Colombia' })
  @Column('varchar', { name: 'official_name' })
  officialName: string;

  @ApiProperty({ example: 'SAYCO' })
  @Column('varchar')
  acronym: string;

  @ApiProperty({ example: 'Colombia', description: 'Nombre legible del país' })
  @Column('varchar')
  country: string;

  @ApiProperty({ example: 'CO', description: 'ISO 3166-1 alpha-2' })
  @Column('varchar', { name: 'iso_country_code', length: 2 })
  isoCountryCode: string;

  @ApiProperty({ example: '84', nullable: true, description: 'Identificador CISAC de la sociedad, cuando esté disponible' })
  @Column('varchar', { name: 'cisac_society_id', nullable: true })
  cisacSocietyId: string | null;

  @ApiProperty({ enum: CollectiveManagementSocietyOrganizationType })
  @Column({
    type: 'enum',
    enum: CollectiveManagementSocietyOrganizationType,
    enumName: 'collective_management_society_organization_type_enum',
    name: 'organization_type',
    default: CollectiveManagementSocietyOrganizationType.CMO,
  })
  organizationType: CollectiveManagementSocietyOrganizationType;

  @ApiProperty({ enum: CollectiveManagementSocietyStatus })
  @Column({
    type: 'enum',
    enum: CollectiveManagementSocietyStatus,
    enumName: 'collective_management_society_status_enum',
    default: CollectiveManagementSocietyStatus.ACTIVE,
  })
  status: CollectiveManagementSocietyStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
