import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { WorkState } from '../entities/work-state.enum';

export class UpdateGeneralInfoDto {
  @ApiProperty({ example: 'Mi Canción' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: ['Título alterno 1'], required: false, description: 'Máximo 4 (formato SAYCO)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4, { message: 'Máximo 4 títulos alternativos' })
  @IsString({ each: true })
  alternativeTitles?: string[];

  @ApiProperty({ example: 'Español' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ example: 'Vallenato' })
  @IsOptional()
  @IsString()
  ritmo?: string;

  @ApiProperty({ example: 210, description: 'Duración declarada, en segundos' })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationSeconds?: number;

  @ApiProperty({ example: '2025-01-15', required: false })
  @IsOptional()
  @IsDateString()
  creationDate?: string;

  @ApiProperty({ example: 'Bogotá, Colombia', required: false })
  @IsOptional()
  @IsString()
  creationPlace?: string;

  @ApiProperty({ enum: WorkState, required: false })
  @IsOptional()
  @IsEnum(WorkState)
  workState?: WorkState;

  @ApiProperty({ example: 'v1', required: false })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
