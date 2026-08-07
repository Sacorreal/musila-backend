import { ApiProperty } from '@nestjs/swagger';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import { PublishingContract } from 'src/publishing-contracts/entities/publishing-contract.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RegistrationFileStatus } from './registration-file-status.enum';
import { WorkState } from './work-state.enum';
import {
  AiUsageData,
  CommissionedWorkData,
  DerivativeWorkData,
  PhonogramData,
} from './registration-file-domain-data.types';
import { RegistrationFileParticipant } from './registration-file-participant.entity';
import { RegistrationFileDocument } from './registration-file-document.entity';
import { RegistrationFileProfileStatus } from './registration-file-profile-status.entity';

/**
 * Snapshot consolidado del último cálculo del Validation Engine — cache de
 * lectura para listados (ej. `MyTracksList`); nunca es la fuente de verdad,
 * que siempre se recalcula on-demand vía `GET /registration-file/:id/completeness`.
 */
export interface RegistrationFileCompletenessSnapshot {
  overallPercentage: number;
  calculatedAt: string;
}

/**
 * Expediente de Registro (Expediente de Obra Musical): unidad central que
 * consolida todos los dominios de información de una obra necesarios para
 * preparar su presentación manual ante SAYCO y/o DNDA. 1:1 con `Track`.
 * Musila NO registra ni envía nada automáticamente — este modelo captura
 * únicamente *hechos de la obra*, agnósticos de destino; qué es obligatorio
 * para cada entidad vive en el `RegistrationProfile` correspondiente (código),
 * no aquí, de forma que agregar futuros perfiles no requiera migrar este esquema.
 */
@Entity({ name: 'registration_file' })
export class RegistrationFile {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'EXP-MUS-2026-000001' })
  @Column({ type: 'varchar', length: 30, name: 'case_number', unique: true })
  caseNumber: string;

  @OneToOne(() => Track, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track: Track;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @ApiProperty({ enum: RegistrationFileStatus, example: RegistrationFileStatus.EN_CONSTRUCCION })
  @Column({
    type: 'enum',
    enum: RegistrationFileStatus,
    enumName: 'registration_file_status_enum',
    default: RegistrationFileStatus.EN_CONSTRUCCION,
  })
  status: RegistrationFileStatus;

  @ApiProperty({ example: ['SAYCO', 'DNDA'], description: 'Perfiles de registro activos para este expediente' })
  @Column({ type: 'jsonb', name: 'active_profile_keys', default: () => "'[]'" })
  activeProfileKeys: string[];

  // ── Dominio 1: Información General ──────────────────────────────────────
  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'jsonb', name: 'alternative_titles', default: () => "'[]'" })
  alternativeTitles: string[];

  @Column({ type: 'varchar' })
  language: string;

  @Column({ type: 'varchar', comment: 'Snapshot de texto del género al momento de crear el expediente' })
  genre: string;

  @Column({ type: 'varchar', nullable: true })
  ritmo: string | null;

  @Column({ type: 'int', name: 'duration_seconds', nullable: true, comment: 'Duración declarada' })
  durationSeconds: number | null;

  @Column({ type: 'date', name: 'creation_date', nullable: true })
  creationDate: string | null;

  @Column({ type: 'varchar', name: 'creation_place', nullable: true })
  creationPlace: string | null;

  @ApiProperty({ enum: WorkState, required: false })
  @Column({ type: 'enum', enum: WorkState, enumName: 'work_state_enum', nullable: true, name: 'work_state' })
  workState: WorkState | null;

  @Column({ type: 'varchar', nullable: true })
  version: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', name: 'internal_code', unique: true })
  internalCode: string;

  // ── Dominio 4: Editorial ─────────────────────────────────────────────────
  @Column({ type: 'boolean', name: 'has_publishing_deal', default: false })
  hasPublishingDeal: boolean;

  @ManyToOne(() => PublishingContract, { nullable: true })
  @JoinColumn({ name: 'publishing_contract_id' })
  publishingContract: PublishingContract | null;

  @Column({ type: 'numeric', precision: 5, scale: 2, name: 'publishing_administered_percentage', nullable: true })
  publishingAdministeredPercentage: number | null;

  // ── Dominio 3: Fonograma (jsonb, bloque atómico) ───────────────────────────
  @Column({ type: 'jsonb', name: 'phonogram_data', nullable: true })
  phonogramData: PhonogramData | null;

  // ── Dominio 5: Obra Derivada (jsonb, bloque atómico) ───────────────────────
  @Column({ type: 'jsonb', name: 'derivative_work_data', nullable: true })
  derivativeWorkData: DerivativeWorkData | null;

  // ── Dominio 6: Obra por Encargo (jsonb, bloque atómico) ────────────────────
  @Column({ type: 'jsonb', name: 'commissioned_work_data', nullable: true })
  commissionedWorkData: CommissionedWorkData | null;

  // ── Dominio 7: Inteligencia Artificial (jsonb, bloque atómico) ─────────────
  @Column({ type: 'jsonb', name: 'ai_usage_data', nullable: true })
  aiUsageData: AiUsageData | null;

  // ── Participantes y Documentos (tablas propias, cardinalidad N) ───────────
  @OneToMany(() => RegistrationFileParticipant, (participant) => participant.registrationFile, { cascade: true })
  participants: RegistrationFileParticipant[];

  @OneToMany(() => RegistrationFileDocument, (document) => document.registrationFile, { cascade: true })
  documents: RegistrationFileDocument[];

  // ── Estado de presentación/registro por perfil activo ──────────────────────
  @OneToMany(() => RegistrationFileProfileStatus, (profileStatus) => profileStatus.registrationFile, {
    cascade: true,
  })
  profileStatuses: RegistrationFileProfileStatus[];

  // ── Completitud y generación del expediente ────────────────────────────────
  @Column({ type: 'jsonb', name: 'completeness_snapshot', nullable: true })
  completenessSnapshot: RegistrationFileCompletenessSnapshot | null;

  @Column({ type: 'varchar', name: 'generated_pdf_key', nullable: true })
  generatedPdfKey: string | null;

  @Column({ type: 'text', name: 'generated_pdf_url', nullable: true })
  generatedPdfUrl: string | null;

  @Column({ type: 'varchar', name: 'generated_zip_key', nullable: true })
  generatedZipKey: string | null;

  @Column({ type: 'text', name: 'generated_zip_url', nullable: true })
  generatedZipUrl: string | null;

  @Column({ type: 'timestamptz', name: 'generated_at', nullable: true })
  generatedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;
}
