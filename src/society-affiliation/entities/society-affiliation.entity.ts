import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/users/entities/user.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CollectiveManagementSociety } from '../../collective-management-society/entities/collective-management-society.entity';
import { SocietyAffiliationRightsType } from './society-affiliation-rights-type.enum';
import { SocietyAffiliationTerritoryMode } from './society-affiliation-territory-mode.enum';
import { SocietyAffiliationStatus } from './society-affiliation-status.enum';
import { SocietyAffiliationVerificationStatus } from './society-affiliation-verification-status.enum';
import { SocietyAffiliationSource } from './society-affiliation-source.enum';

/**
 * Relación autor ↔ sociedad de gestión colectiva (§4). Un autor puede tener
 * varias afiliaciones simultáneas (distintas sociedades, `rightsType` o
 * territorios) — nunca se asume una única CMO por autor. No se hace
 * hard-delete: una afiliación se "finaliza" (`status = ENDED`), preservando
 * el histórico. La unicidad de la combinación activa (autor + sociedad +
 * derecho + territorio) se aplica vía índice único parcial en la migración
 * SOLO para el duplicado exacto (mismo `territoryMode` + `territoryCountries`)
 * — TypeORM no soporta `WHERE` en `@Unique`. El solapamiento semántico entre
 * territorios (ej. `WORLDWIDE` vs `WORLDWIDE_EXCEPT`) no es expresable como
 * índice de igualdad y se valida en `SocietyAffiliationService.assertNoActiveOverlap`.
 */
@Entity({ name: 'society_affiliations' })
@Index(['authorId'])
@Index(['collectiveManagementSocietyId'])
@Index(['rightsType'])
@Index(['territoryMode'])
@Index(['ipiNameNumber'])
@Index(['status'])
export class SocietyAffiliation {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column('uuid', { name: 'author_id' })
  authorId: string;

  @ManyToOne(() => CollectiveManagementSociety, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'collective_management_society_id' })
  collectiveManagementSociety: CollectiveManagementSociety;

  @Column('uuid', { name: 'collective_management_society_id' })
  collectiveManagementSocietyId: string;

  @ApiProperty({ enum: SocietyAffiliationRightsType })
  @Column({
    type: 'enum',
    enum: SocietyAffiliationRightsType,
    enumName: 'society_affiliation_rights_type_enum',
    name: 'rights_type',
  })
  rightsType: SocietyAffiliationRightsType;

  @ApiProperty({ enum: SocietyAffiliationTerritoryMode })
  @Column({
    type: 'enum',
    enum: SocietyAffiliationTerritoryMode,
    enumName: 'society_affiliation_territory_mode_enum',
    name: 'territory_mode',
  })
  territoryMode: SocietyAffiliationTerritoryMode;

  @ApiProperty({
    type: [String],
    example: ['CO'],
    description:
      'Según territoryMode: países incluidos (SPECIFIC_COUNTRIES), países excluidos (WORLDWIDE_EXCEPT), o vacío (WORLDWIDE). ISO 3166-1 alpha-2.',
  })
  @Column({ type: 'jsonb', name: 'territory_countries', default: () => "'[]'" })
  territoryCountries: string[];

  @ApiProperty({ example: '12345', nullable: true })
  @Column('varchar', { name: 'membership_number', nullable: true })
  membershipNumber: string | null;

  @ApiProperty({ example: '12345678901', nullable: true, description: 'IPI Name Number (CISAC)' })
  @Column('varchar', { name: 'ipi_name_number', nullable: true })
  ipiNameNumber: string | null;

  @ApiProperty({ example: '123456789', nullable: true })
  @Column('varchar', { name: 'ipi_base_number', nullable: true })
  ipiBaseNumber: string | null;

  @ApiProperty({ example: '2026-01-01', nullable: true })
  @Column('date', { name: 'valid_from', nullable: true })
  validFrom: string | null;

  @ApiProperty({ example: null, nullable: true })
  @Column('date', { name: 'valid_to', nullable: true })
  validTo: string | null;

  @ApiProperty({ enum: SocietyAffiliationStatus })
  @Column({
    type: 'enum',
    enum: SocietyAffiliationStatus,
    enumName: 'society_affiliation_status_enum',
    default: SocietyAffiliationStatus.PENDING,
  })
  status: SocietyAffiliationStatus;

  @ApiProperty({ enum: SocietyAffiliationVerificationStatus })
  @Column({
    type: 'enum',
    enum: SocietyAffiliationVerificationStatus,
    enumName: 'society_affiliation_verification_status_enum',
    name: 'verification_status',
    default: SocietyAffiliationVerificationStatus.UNVERIFIED,
  })
  verificationStatus: SocietyAffiliationVerificationStatus;

  @ApiProperty({ enum: SocietyAffiliationSource })
  @Column({
    type: 'enum',
    enum: SocietyAffiliationSource,
    enumName: 'society_affiliation_source_enum',
    default: SocietyAffiliationSource.SELF_DECLARED,
  })
  source: SocietyAffiliationSource;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
