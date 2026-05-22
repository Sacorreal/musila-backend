import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterTrackDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Buscar por título (búsqueda parcial)', example: 'amor', type: String })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Filtrar por género gospel', example: true, type: Boolean })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isGospel?: boolean;

  @ApiPropertyOptional({ description: 'Filtrar por ID de género musical', example: '123e4567-e89b-12d3-a456-426614174000', type: String })
  @IsString()
  @IsOptional()
  genreId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por subgénero musical', example: 'Rock alternativo', type: String })
  @IsString()
  @IsOptional()
  subGenre?: string;

  @ApiPropertyOptional({ description: 'Filtrar por idioma', example: 'es', type: String })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ description: 'Filtrar por estado de disponibilidad', example: true, type: Boolean })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isAvailable?: boolean;
}