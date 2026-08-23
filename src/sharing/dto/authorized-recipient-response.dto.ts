import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthorizedRecipientResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  recipientUserId: string;

  @ApiProperty({ example: 'Juan Pérez' })
  recipientName: string;

  @ApiProperty({ example: 'Nombre123' })
  recipientUsername: string;

  @ApiPropertyOptional({ description: 'Fecha de revocación, si aplica' })
  revokedAt?: Date | null;

  @ApiProperty()
  createdAt: Date;
}
