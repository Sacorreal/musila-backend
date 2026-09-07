import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AffiliateStatus } from '../entities/affiliate-status.enum';

export class UpdateAffiliateStatusDto {
  @ApiProperty({ enum: AffiliateStatus })
  @IsEnum(AffiliateStatus)
  status: AffiliateStatus;
}
