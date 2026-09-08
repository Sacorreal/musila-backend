import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CampaignVisibility } from '../entities/campaign-visibility.enum';
import { CampaignGenreFilterInputDto } from './campaign-genre-filter-input.dto';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Buscamos tracks urbanos para el verano' })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title: string;

  @ApiPropertyOptional({
    example: 'Sony Music',
    description: 'Nombre a mostrar en la tarjeta. Si se omite, se usa el nombre del workspace del sello.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  authorName?: string;

  @ApiPropertyOptional({ enum: CampaignVisibility, default: CampaignVisibility.PUBLIC })
  @IsOptional()
  @IsEnum(CampaignVisibility)
  visibility?: CampaignVisibility;

  @ApiPropertyOptional({ description: 'Cover opcional; si se omite se usa el logo del sello o sus iniciales' })
  @IsOptional()
  @IsUrl()
  coverUrl?: string;

  @ApiProperty({ type: [CampaignGenreFilterInputDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Selecciona al menos un género' })
  @ValidateNested({ each: true })
  @Type(() => CampaignGenreFilterInputDto)
  genres: CampaignGenreFilterInputDto[];

  @ApiProperty({ example: 3, description: 'Cantidad máxima de canciones que un mismo compositor puede postular' })
  @IsInt()
  @Min(1)
  @Max(100)
  songsPerComposerLimit: number;

  @ApiProperty({ example: 10, description: 'Cantidad de canciones requeridas para dar por cumplida la campaña' })
  @IsInt()
  @Min(1)
  @Max(10000)
  requiredSongsCount: number;

  @ApiProperty({ description: 'Fecha máxima de recepción de canciones (ISO 8601)' })
  @IsDateString()
  deadline: string;
}
