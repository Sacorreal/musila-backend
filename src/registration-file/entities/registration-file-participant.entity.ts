import { ApiProperty } from '@nestjs/swagger';
import { SplitAuthor } from 'src/splits/entities/split-author.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RegistrationFile } from './registration-file.entity';
import { RegistrationFileParticipantRole } from './registration-file-participant-role.enum';

/**
 * Participante de la obra para efectos de declaración legal (dominio 2 del
 * expediente). Entidad independiente de `SplitAuthor` (reparto de regalías
 * con firma OTP): admite participantes sin cuenta Musila (editores,
 * administradores externos) y campos exigidos por SAYCO/DNDA que
 * `SplitAuthor` no tiene. `splitAuthor` es un vínculo opcional únicamente
 * para autocompletar datos cuando el participante ya es coautor registrado.
 */
@Entity({ name: 'registration_file_participant' })
export class RegistrationFileParticipant {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => RegistrationFile, (registrationFile) => registrationFile.participants, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'registration_file_id' })
  registrationFile: RegistrationFile;

  @ManyToOne(() => SplitAuthor, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'split_author_id' })
  splitAuthor: SplitAuthor | null;

  @Column({ type: 'varchar', name: 'full_name' })
  fullName: string;

  @Column({ type: 'varchar', name: 'document_type', nullable: true })
  documentType: string | null;

  @Column({ type: 'varchar', name: 'document_number', nullable: true })
  documentNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  nationality: string | null;

  @Column({ type: 'varchar', name: 'management_society', nullable: true })
  managementSociety: string | null;

  @Column({ type: 'varchar', name: 'ipi_code', nullable: true })
  ipiCode: string | null;

  @Column({ type: 'varchar', name: 'sayco_code', nullable: true, comment: 'Carné SAYCO' })
  saycoCode: string | null;

  @Column({ type: 'varchar', name: 'sayco_ip_name', nullable: true, comment: 'Campo "IP Name" del formulario SAYCO' })
  saycoIpName: string | null;

  @ApiProperty({ enum: RegistrationFileParticipantRole })
  @Column({
    type: 'enum',
    enum: RegistrationFileParticipantRole,
    enumName: 'registration_file_participant_role_enum',
  })
  role: RegistrationFileParticipantRole;

  @ApiProperty({ example: 50, description: '% de participación autoral (ejecución pública / PER)' })
  @Column({ type: 'numeric', precision: 5, scale: 2, name: 'authorial_percentage' })
  authorialPercentage: number;

  @ApiProperty({ example: 50, description: '% de participación mecánica (mecánicos y sincronización / MEC)' })
  @Column({ type: 'numeric', precision: 5, scale: 2, name: 'mechanical_percentage' })
  mechanicalPercentage: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  /** True si no está vinculado a un `SplitAuthor` — participante sin cuenta Musila. */
  get isExternal(): boolean {
    return !this.splitAuthor;
  }
}
