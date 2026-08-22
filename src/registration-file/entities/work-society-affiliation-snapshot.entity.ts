import { ApiProperty } from '@nestjs/swagger';
import { SocietyAffiliationRightsType } from 'src/society-affiliation/entities/society-affiliation-rights-type.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RegistrationFile } from './registration-file.entity';
import { RegistrationFileParticipant } from './registration-file-participant.entity';

/**
 * Snapshot histórico de las `SocietyAffiliation` vigentes de un autor en el
 * momento en que se capturaron sus datos en un expediente (§8 del
 * requerimiento). Aditivo: no modifica `RegistrationFileParticipant`. Los
 * campos de sociedad se denormalizan (`societyName`, `cisacSocietyId`) para
 * que el snapshot sobreviva aunque el catálogo o la afiliación origen
 * cambien después — por eso `societyAffiliationId` no lleva FK (referencia
 * informativa únicamente).
 */
@Entity({ name: 'work_society_affiliation_snapshots' })
@Index(['registrationFileId'])
@Index(['registrationFileParticipantId'])
export class WorkSocietyAffiliationSnapshot {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => RegistrationFile, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'registration_file_id' })
  registrationFile: RegistrationFile;

  @Column('uuid', { name: 'registration_file_id' })
  registrationFileId: string;

  @ManyToOne(() => RegistrationFileParticipant, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'registration_file_participant_id' })
  registrationFileParticipant: RegistrationFileParticipant;

  @Column('uuid', { name: 'registration_file_participant_id' })
  registrationFileParticipantId: string;

  @Column('uuid', { name: 'author_id' })
  authorId: string;

  @Column('uuid', { name: 'society_affiliation_id', nullable: true })
  societyAffiliationId: string | null;

  @Column('uuid', { name: 'society_id' })
  societyId: string;

  @Column('varchar', { name: 'society_name' })
  societyName: string;

  @Column('varchar', { name: 'cisac_society_id', nullable: true })
  cisacSocietyId: string | null;

  @ApiProperty({ enum: SocietyAffiliationRightsType })
  @Column({
    type: 'enum',
    enum: SocietyAffiliationRightsType,
    enumName: 'society_affiliation_rights_type_enum',
    name: 'rights_type',
  })
  rightsType: SocietyAffiliationRightsType;

  @Column('varchar', { length: 2 })
  territory: string;

  @Column('varchar', { name: 'ipi_name_number', nullable: true })
  ipiNameNumber: string | null;

  @Column('varchar', { name: 'membership_number', nullable: true })
  membershipNumber: string | null;

  @CreateDateColumn({ name: 'captured_at', type: 'timestamptz' })
  capturedAt: Date;
}
