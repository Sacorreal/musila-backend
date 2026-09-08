import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CampaignSubmission } from '../entities/campaign-submission.entity';
import { CampaignSubmissionStatus } from '../entities/campaign-submission-status.enum';

export class CampaignSubmissionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() campaignId: string;
  @ApiProperty() trackId: string;
  @ApiProperty() trackTitle: string;
  @ApiPropertyOptional() trackCoverUrl?: string | null;
  @ApiPropertyOptional() trackAudioUrl?: string | null;
  @ApiProperty() composerId: string;
  @ApiProperty() composerName: string;
  @ApiProperty({ enum: CampaignSubmissionStatus }) status: CampaignSubmissionStatus;
  @ApiPropertyOptional() requestedTrackId?: string | null;
  @ApiProperty() createdAt: Date;

  static fromEntity(submission: CampaignSubmission): CampaignSubmissionResponseDto {
    const dto = new CampaignSubmissionResponseDto();
    dto.id = submission.id;
    dto.campaignId = submission.campaignId;
    dto.trackId = submission.trackId;
    dto.trackTitle = submission.track?.title ?? '';
    dto.trackCoverUrl = submission.track?.coverUrl ?? null;
    dto.trackAudioUrl = submission.track?.audioUrl ?? null;
    dto.composerId = submission.composerId;
    dto.composerName = submission.composer?.name ?? '';
    dto.status = submission.status;
    dto.requestedTrackId = submission.requestedTrackId ?? null;
    dto.createdAt = submission.createdAt;
    return dto;
  }
}
