import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class UpdateTrackNoteDto {
  @ApiPropertyOptional({ description: 'Contenido de la nota', example: 'Buen coro para el spot de verano' })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  content?: string;

  @ApiPropertyOptional({
    description: 'Segundo de la reproducción al que queda anclada la nota',
    example: 42,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  timestampSeconds?: number;
}
