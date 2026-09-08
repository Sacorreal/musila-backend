import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CampaignVisibility } from './campaign-visibility.enum';
import { CampaignStatus } from './campaign-status.enum';
import { CampaignClosedReason } from './campaign-closed-reason.enum';
import { CampaignGenreFilter } from '../campaign.types';

/**
 * Campaña para recibir canciones (§CREACIÓN DE CAMPAÑAS): buzón de recepción
 * digital, de una organización (sello/B2B) o personal de un usuario
 * individual que puede buscar canciones en el marketplace. Se cierra sola por
 * fecha límite o por cupo de canciones seleccionadas, pero nunca se borra
 * físicamente (`deletedAt`) — permanece en el historial de su dueño hasta que
 * decide eliminarla manualmente.
 *
 * `organizationId` nulo = campaña personal, cuyo dueño es `createdByUserId`.
 */
@Entity({ name: 'campaigns' })
@Index('idx_campaign_organization_status', ['organizationId', 'status'])
@Index('idx_campaign_creator_status', ['createdByUserId', 'status'])
@Index('idx_campaign_public_listing', ['visibility', 'status', 'deadline'])
export class Campaign {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Nulo para una campaña personal (sin organización) — ver `createdByUserId`. */
  @ApiPropertyOptional()
  @Column('uuid', { name: 'organization_id', nullable: true })
  organizationId?: string | null;

  /** Usuario creador; siempre presente. Dueño efectivo cuando `organizationId` es nulo. */
  @ApiProperty()
  @Column('uuid', { name: 'created_by_user_id' })
  createdByUserId: string;

  @ApiProperty({ example: 'Buscamos tracks urbanos para el verano' })
  @Column('varchar', { length: 150 })
  title: string;

  /** Nombre a mostrar en la tarjeta (ej. "Sony Music", o el nombre del compositor si es personal). Editable, precargado automáticamente. */
  @ApiProperty({ example: 'Sony Music' })
  @Column('varchar', { name: 'author_name', length: 150 })
  authorName: string;

  /** Autogenerada: `"Géneros buscados: [género(s)]"`. Nunca editable por el usuario. */
  @ApiProperty()
  @Column('text')
  description: string;

  @ApiProperty({ enum: CampaignVisibility, example: CampaignVisibility.PUBLIC })
  @Column('varchar', { length: 10, default: CampaignVisibility.PUBLIC })
  visibility: CampaignVisibility;

  @ApiPropertyOptional({ description: 'Token único del enlace de campaña privada' })
  @Index({ unique: true, where: '"private_token" IS NOT NULL' })
  @Column('varchar', { name: 'private_token', nullable: true })
  privateToken?: string | null;

  @ApiPropertyOptional()
  @Column('varchar', { name: 'cover_url', nullable: true })
  coverUrl?: string | null;

  /** Snapshot de géneros/ritmos buscados (ver `CampaignGenreFilter`). */
  @ApiProperty({ type: [Object] })
  @Column('jsonb', { name: 'genre_filters' })
  genreFilters: CampaignGenreFilter[];

  @ApiProperty({ example: 3 })
  @Column('int', { name: 'songs_per_composer_limit' })
  songsPerComposerLimit: number;

  @ApiProperty({ example: 10 })
  @Column('int', { name: 'required_songs_count' })
  requiredSongsCount: number;

  @ApiProperty()
  @Column('timestamptz')
  deadline: Date;

  @ApiProperty({ enum: CampaignStatus, example: CampaignStatus.ACTIVE })
  @Column('varchar', { length: 10, default: CampaignStatus.ACTIVE })
  status: CampaignStatus;

  @ApiPropertyOptional({ enum: CampaignClosedReason })
  @Column('varchar', { name: 'closed_reason', length: 10, nullable: true })
  closedReason?: CampaignClosedReason | null;

  @ApiPropertyOptional()
  @Column('timestamptz', { name: 'closed_at', nullable: true })
  closedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;
}
