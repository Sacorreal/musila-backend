import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { AffiliateStatus } from '../entities/affiliate-status.enum';
import { AffiliateTier } from '../entities/affiliate-tier.enum';

export class AffiliatePaginationDto extends PaginationDto {
  @ApiPropertyOptional({ enum: AffiliateStatus })
  @IsOptional()
  @IsEnum(AffiliateStatus)
  status?: AffiliateStatus;

  @ApiPropertyOptional({ enum: AffiliateTier })
  @IsOptional()
  @IsEnum(AffiliateTier)
  tier?: AffiliateTier;

  @ApiPropertyOptional({ description: 'Búsqueda por nombre o email' })
  @IsOptional()
  @IsString()
  q?: string;
}
