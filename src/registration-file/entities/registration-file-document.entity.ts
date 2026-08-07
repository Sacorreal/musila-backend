import { ApiProperty } from '@nestjs/swagger';
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
import { RegistrationFileDocumentType } from './registration-file-document-type.enum';
import { RegistrationFileDocumentStatus } from './registration-file-document-status.enum';

/**
 * Documento tipificado del expediente. Cada re-subida crea una nueva fila
 * con `version` incrementada (no se sobreescribe), preservando el historial
 * — necesario para la trazabilidad exigida por el requerimiento.
 */
@Entity({ name: 'registration_file_document' })
export class RegistrationFileDocument {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => RegistrationFile, (registrationFile) => registrationFile.documents, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'registration_file_id' })
  registrationFile: RegistrationFile;

  @ApiProperty({ enum: RegistrationFileDocumentType })
  @Column({
    type: 'enum',
    enum: RegistrationFileDocumentType,
    enumName: 'registration_file_document_type_enum',
    name: 'document_type',
  })
  documentType: RegistrationFileDocumentType;

  @Column({ type: 'varchar', name: 'file_key' })
  fileKey: string;

  @Column({ type: 'text', name: 'file_url' })
  fileUrl: string;

  @Column({ type: 'varchar', name: 'file_name' })
  fileName: string;

  @Column({ type: 'varchar', name: 'mime_type' })
  mimeType: string;

  @Column({ type: 'bigint', name: 'file_size_bytes' })
  fileSizeBytes: number;

  @Column({ type: 'int', default: 1 })
  version: number;

  @ApiProperty({ enum: RegistrationFileDocumentStatus, example: RegistrationFileDocumentStatus.CARGADO })
  @Column({
    type: 'enum',
    enum: RegistrationFileDocumentStatus,
    enumName: 'registration_file_document_status_enum',
    default: RegistrationFileDocumentStatus.CARGADO,
  })
  status: RegistrationFileDocumentStatus;

  @Column({ type: 'char', length: 64, name: 'sha256_hash', nullable: true })
  sha256Hash: string | null;

  @Column({ type: 'uuid', name: 'legal_proof_id', nullable: true, comment: 'Referencia polimórfica a LegalProof, sin FK física' })
  legalProofId: string | null;

  @Column({ type: 'uuid', name: 'uploaded_by_user_id', nullable: true })
  uploadedByUserId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
