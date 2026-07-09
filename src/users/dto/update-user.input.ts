

import { CreateUserInput } from './create-user.input';
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserPlan } from '../entities/user-plan.enum';

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
}
