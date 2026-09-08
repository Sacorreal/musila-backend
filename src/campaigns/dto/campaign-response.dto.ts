import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Campaign } from '../entities/campaign.entity';
import { CampaignVisibility } from '../entities/campaign-visibility.enum';
import { CampaignStatus } from '../entities/campaign-status.enum';
import { CampaignClosedReason } from '../entities/campaign-closed-reason.enum';
import { CampaignGenreFilter } from '../campaign.types';
import { CampaignProgressDto } from './campaign-progress.dto';

export class CampaignResponseDto {
  @ApiProperty() id: string;
  @ApiPropertyOptional({ description: 'Nulo si es una campaña personal (sin organización)' })
  organizationId?: string | null;
  @ApiProperty() createdByUserId: string;
  @ApiProperty() title: string;
  @ApiProperty() authorName: string;
  @ApiProperty() description: string;
  @ApiProperty({ enum: CampaignVisibility }) visibility: CampaignVisibility;
  @ApiPropertyOptional() coverUrl?: string | null;
  @ApiPropertyOptional({ description: 'Cover resuelto: coverUrl propio, o el logo del workspace del sello' })
  displayCoverUrl?: string | null;
  @ApiProperty({ type: [Object] }) genreFilters: CampaignGenreFilter[];
  @ApiProperty() songsPerComposerLimit: number;
  @ApiProperty() requiredSongsCount: number;
  @ApiProperty() deadline: Date;
  @ApiProperty({ enum: CampaignStatus }) status: CampaignStatus;
  @ApiPropertyOptional({ enum: CampaignClosedReason }) closedReason?: CampaignClosedReason | null;
  @ApiPropertyOptional() closedAt?: Date | null;
  @ApiPropertyOptional({ description: 'Solo visible para el sello dueño de una campaña privada' })
  privateToken?: string | null;
  @ApiPropertyOptional({ type: CampaignProgressDto })
  progress?: CampaignProgressDto;
  @ApiProperty() createdAt: Date;

  static fromEntity(
    campaign: Campaign,
    opts: { displayCoverUrl?: string | null; progress?: CampaignProgressDto; includePrivateToken?: boolean } = {},
  ): CampaignResponseDto {
    const dto = new CampaignResponseDto();
    dto.id = campaign.id;
    dto.organizationId = campaign.organizationId ?? null;
    dto.createdByUserId = campaign.createdByUserId;
    dto.title = campaign.title;
    dto.authorName = campaign.authorName;
    dto.description = campaign.description;
    dto.visibility = campaign.visibility;
    dto.coverUrl = campaign.coverUrl ?? null;
    dto.displayCoverUrl = opts.displayCoverUrl ?? campaign.coverUrl ?? null;
    dto.genreFilters = campaign.genreFilters;
    dto.songsPerComposerLimit = campaign.songsPerComposerLimit;
    dto.requiredSongsCount = campaign.requiredSongsCount;
    dto.deadline = campaign.deadline;
    dto.status = campaign.status;
    dto.closedReason = campaign.closedReason ?? null;
    dto.closedAt = campaign.closedAt ?? null;
    dto.createdAt = campaign.createdAt;
    if (opts.includePrivateToken) dto.privateToken = campaign.privateToken ?? null;
    if (opts.progress) dto.progress = opts.progress;
    return dto;
  }
}
