import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, Min } from 'class-validator';

export class LicenseInstallmentInputDto {
  @ApiProperty({ example: 500000, description: 'Valor de la cuota en COP' })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El valor de la cuota debe ser un número válido' })
  @Min(1, { message: 'El valor de la cuota debe ser mayor a 0' })
  amount: number;

  @ApiProperty({ example: '2026-09-01T00:00:00.000Z', description: 'Fecha pactada de pago de la cuota' })
  @IsDateString()
  dueDate: string;
}
