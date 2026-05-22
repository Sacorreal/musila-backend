import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RequestsStatus } from '../entities/requests-status.enum';
import { LicenseType } from '../entities/license-type.enum';

export class UpdateRequestedTrackInput {
  @ApiPropertyOptional({ enum: RequestsStatus })
  @IsOptional()
  @IsEnum(RequestsStatus)
  status?: RequestsStatus;

  @ApiPropertyOptional({ enum: LicenseType })
  @IsOptional()
  @IsEnum(LicenseType)
  licenseType?: LicenseType;

  @ApiPropertyOptional({ type: String, description: 'URL pública del documento de licencia subido al storage' })
  @IsOptional()
  @IsString()
  documentUrl?: string;
}
