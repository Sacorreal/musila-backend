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
import { Campaign } from './campaign.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import { CampaignSubmissionStatus } from './campaign-submission-status.enum';

/**
 * Postulación de un compositor a una campaña (§Postulación a campañas). Al
 * pasar a `SELECTED` se crea un `RequestedTrack` reutilizando el flujo de
 * solicitud ya implementado — `requestedTrackId` guarda la referencia.
 */
@Entity({ name: 'campaign_submissions' })
@Index('uq_campaign_submission_track', ['campaignId', 'trackId'], { unique: true })
@Index('idx_campaign_submission_composer', ['composerId'])
export class CampaignSubmission {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Campaign, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Column('uuid', { name: 'campaign_id' })
  campaignId: string;

  @ManyToOne(() => Track, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'track_id' })
  track: Track;

  @Column('uuid', { name: 'track_id' })
  trackId: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'composer_id' })
  composer: User;

  @Column('uuid', { name: 'composer_id' })
  composerId: string;

  @ApiProperty({ enum: CampaignSubmissionStatus, example: CampaignSubmissionStatus.PENDING })
  @Column('varchar', { length: 10, default: CampaignSubmissionStatus.PENDING })
  status: CampaignSubmissionStatus;

  @ApiPropertyOptional()
  @Column('uuid', { name: 'requested_track_id', nullable: true })
  requestedTrackId?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
