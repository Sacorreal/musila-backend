import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class FindTrackNotesDto {
  @ApiProperty({
    description: 'ID del track del que se listan las notas',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  trackId: string;

  @ApiPropertyOptional({
    description:
      'ID de la playlist. Si se envía, retorna las notas de todos los miembros de la playlist; si se omite, retorna solo las notas privadas del usuario autenticado.',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  playlistId?: string;
}
