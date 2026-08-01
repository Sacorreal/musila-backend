import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShareAccessReason } from '../entities/share-access-reason.enum';
import { ShareResourceType } from '../entities/share-resource-type.enum';

export class ValidateAccessResponseDto {
  @ApiProperty({ example: true })
  granted: boolean;

  @ApiProperty({ enum: ShareAccessReason })
  reason: ShareAccessReason;

  @ApiPropertyOptional({ enum: ShareResourceType })
  resourceType?: ShareResourceType;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  resourceId?: string;
}
