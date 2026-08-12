import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { Organization } from './organization.entity';
import { WorkspaceInviteLinkStatus } from './workspace-invite-link-status.enum';

/**
 * Enlace de invitación reutilizable a nivel de workspace. A diferencia de
 * `OrganizationInvite` (por-email, un solo destinatario, rol fijo), este enlace
 * es genérico: el administrador lo comparte con su equipo y cada persona que se
 * registra a través de él genera una solicitud de acceso (`AccessRequest`)
 * pendiente de aprobación. Es revocable y con expiración configurable, para
 * evitar accesos no autorizados.
 */
@Entity({ name: 'workspace_invite_links' })
@Index(['organizationId', 'status'])
export class WorkspaceInviteLink {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column('uuid', { name: 'organization_id' })
  organizationId: string;

  @ApiProperty({ description: 'Token único URL-friendly del enlace' })
  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  token: string;

  @ApiProperty({ enum: WorkspaceInviteLinkStatus, example: WorkspaceInviteLinkStatus.ACTIVE })
  @Column({ type: 'varchar', length: 20, default: WorkspaceInviteLinkStatus.ACTIVE })
  status: WorkspaceInviteLinkStatus;

  @ApiPropertyOptional({ description: 'Administrador que generó el enlace' })
  @Column('uuid', { name: 'created_by', nullable: true })
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Expiración del enlace (null = sin expiración)' })
  @Column({ type: 'timestamptz', name: 'expires_at', nullable: true })
  expiresAt?: Date | null;

  @ApiPropertyOptional({ description: 'Máximo de usos permitidos (null = ilimitado)' })
  @Column('int', { name: 'max_uses', nullable: true })
  maxUses?: number | null;

  @ApiProperty({ example: 0, description: 'Cantidad de registros realizados con el enlace' })
  @Column('int', { name: 'use_count', default: 0 })
  useCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
