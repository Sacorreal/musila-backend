import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { RegistrationFile } from './registration-file.entity';
import { RegistrationFileProfileSubmissionStatus } from './registration-file-profile-submission-status.enum';
import { RegistrationProfileKey } from './registration-profile-key.type';

/**
 * Estado de presentación/registro de UN perfil activo (SAYCO o DNDA) para un
 * expediente. Independiente del `RegistrationFile.status` (que solo mide
 * preparación): un mismo expediente puede tener SAYCO ya "Presentado" y DNDA
 * todavía "Pendiente", cada uno con su propio número de registro oficial.
 */
@Entity({ name: 'registration_file_profile_status' })
@Unique('UQ_registration_file_profile', ['registrationFile', 'profileKey'])
export class RegistrationFileProfileStatus {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => RegistrationFile, (registrationFile) => registrationFile.profileStatuses, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'registration_file_id' })
  registrationFile: RegistrationFile;

  @ApiProperty({ example: 'SAYCO' })
  @Column({ type: 'varchar', name: 'profile_key' })
  profileKey: RegistrationProfileKey;

  @ApiProperty({ enum: RegistrationFileProfileSubmissionStatus })
  @Column({
    type: 'enum',
    enum: RegistrationFileProfileSubmissionStatus,
    enumName: 'registration_file_profile_submission_status_enum',
    default: RegistrationFileProfileSubmissionStatus.PENDIENTE,
  })
  status: RegistrationFileProfileSubmissionStatus;

  @Column({ type: 'timestamptz', name: 'submitted_at', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'registered_at', nullable: true })
  registeredAt: Date | null;

  @Column({ type: 'varchar', name: 'official_registry_number', nullable: true })
  officialRegistryNumber: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
