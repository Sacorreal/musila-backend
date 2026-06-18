import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class SetLicensePriceDto {
  @ApiProperty({ description: 'Precio de la licencia en COP', example: 500000 })
  @IsNumber()
  @Min(1)
  priceInCOP: number;
}
