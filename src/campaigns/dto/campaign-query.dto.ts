import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { CampaignStatus } from '../entities/campaign-status.enum';

export class CampaignQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: CampaignStatus, description: 'Filtrar por estado (por defecto trae activas y cerradas)' })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;
}
