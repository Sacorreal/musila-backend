import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AffiliateTier } from '../entities/affiliate-tier.enum';

export class UpdateAffiliateTierDto {
  @ApiProperty({ enum: AffiliateTier })
  @IsEnum(AffiliateTier)
  tier: AffiliateTier;
}
