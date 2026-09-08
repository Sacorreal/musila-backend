import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class BuyerDashboardLicensesQueryDto {
  @ApiPropertyOptional({
    example: '2026-09',
    description: "Mes a consultar en formato 'YYYY-MM'. Por defecto, el mes calendario actual.",
  })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month debe tener formato YYYY-MM' })
  month?: string;
}
