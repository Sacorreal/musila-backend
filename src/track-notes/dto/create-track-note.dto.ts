import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class CreateTrackNoteDto {
  @ApiProperty({
    description: 'ID del track sobre el que se deja la nota',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  trackId: string;

  @ApiPropertyOptional({
    description:
      'ID de la playlist que contiene el track. Si se envía, la nota es visible para todos los miembros de esa playlist; si se omite, la nota es privada y solo la ve su autor.',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  playlistId?: string;

  @ApiProperty({ description: 'Contenido de la nota', example: 'Buen coro para el spot de verano' })
  @IsString()
  @Length(1, 2000)
  content: string;

  @ApiPropertyOptional({
    description: 'Segundo de la reproducción al que queda anclada la nota',
    example: 42,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  timestampSeconds?: number;
}
