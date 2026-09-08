import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * Selección de un género para la campaña: ritmos puntuales, o `ritmos: null`/
 * omitido para "todos los ritmos del género" (§1 Creación de la campaña).
 */
export class CampaignGenreFilterInputDto {
  @ApiProperty({ description: 'UUID del género musical' })
  @IsUUID()
  genreId: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Ritmos específicos del género buscados. Omitir para incluir todos los ritmos del género.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  ritmos?: string[];
}
