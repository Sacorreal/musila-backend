import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShareResourceType } from '../entities/share-resource-type.enum';

export class ShareLinkResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4e5f6...' })
  token: string;

  @ApiProperty({ enum: ShareResourceType })
  resourceType: ShareResourceType;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  resourceId: string;

  @ApiProperty({ description: 'URL pública para compartir' })
  shareUrl: string;

  @ApiPropertyOptional({ description: 'Fecha de expiración, si aplica' })
  expiresAt?: Date | null;

  @ApiPropertyOptional({ description: 'Fecha de revocación, si el enlace fue revocado' })
  revokedAt?: Date | null;

  @ApiProperty({ example: 0 })
  viewCount: number;

  @ApiProperty()
  createdAt: Date;
}
