import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class EndSocietyAffiliationDto {
  @ApiPropertyOptional({ example: '2026-12-31', description: 'Fecha de fin. Si se omite, se usa la fecha actual.' })
  @IsOptional()
  @IsDateString()
  validTo?: string;
}
