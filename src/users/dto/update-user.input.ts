

import { CreateUserInput } from './create-user.input';
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserPlan } from '../entities/user-plan.enum';
import { ProSociety } from '../entities/pro-society.enum';

export class UpdateUserInput extends PartialType(CreateUserInput) {
  @ApiPropertyOptional({ enum: UserPlan, description: 'Plan del usuario (Admin)' })
  @IsOptional()
  @IsEnum(UserPlan)
  plan?: UserPlan;

  @ApiPropertyOptional({ description: 'Fecha de expiración del plan, ISO 8601 (Admin)' })
  @IsOptional()
  @IsDateString()
  planExpiresAt?: string;

  @ApiPropertyOptional({ description: 'Razón social o nombre para facturación' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fiscalName?: string;

  @ApiPropertyOptional({ description: 'NIT / RUT / RFC del usuario' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  taxId?: string;

  @ApiPropertyOptional({ description: 'Dirección fiscal completa' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  fiscalAddress?: string;

  @ApiPropertyOptional({
    enum: ProSociety,
    description: 'Sociedad autoral o PRO a la que pertenece el usuario',
  })
  @IsOptional()
  @IsEnum(ProSociety, { message: 'La sociedad autoral debe ser un valor válido de ProSociety' })
  proSociety?: ProSociety;

  @ApiPropertyOptional({ description: 'Número IPI del usuario' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ipiNumber?: string;

  @ApiPropertyOptional({ description: 'Editora musical del usuario' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  publisher?: string;
}
