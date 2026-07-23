import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProSociety } from '../entities/pro-society.enum';

export class UpdateMeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) secondName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) secondLastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) biography?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20)  phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10)  countryCode?: string;

  @ApiPropertyOptional({ enum: ProSociety, description: 'Sociedad autoral o PRO a la que pertenece el usuario' })
  @IsOptional()
  @IsEnum(ProSociety, { message: 'La sociedad autoral debe ser un valor válido de ProSociety' })
  proSociety?: ProSociety;

  @ApiPropertyOptional({ description: 'Número IPI del usuario' })
  @IsOptional() @IsString() @MaxLength(50)
  ipiNumber?: string;

  @ApiPropertyOptional({ description: 'Editora musical del usuario' })
  @IsOptional() @IsString() @MaxLength(200)
  publisher?: string;
}
