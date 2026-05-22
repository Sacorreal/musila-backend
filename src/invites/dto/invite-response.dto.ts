import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InviteResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'a1b2c3d4e5f6...' })
  token: string;

  @ApiPropertyOptional({ example: 'colaborador@example.com' })
  email?: string;

  @ApiProperty({ example: false })
  isUsed: boolean;

  @ApiProperty({ example: '2025-04-10T21:00:00.000Z', description: 'Timestamp de expiración (24h)' })
  expiresAt: Date;

  @ApiProperty({ description: 'URL para redimir la invitación' })
  inviteUrl: string;

  @ApiProperty({ description: 'QR en formato base64 Data URI' })
  qrCode: string;

  @ApiProperty({ example: '2025-04-09T21:00:00.000Z' })
  createdAt: Date;
}
