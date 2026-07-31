import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class CreateWithdrawalDto {
  @ApiProperty({ example: 150000, description: 'Monto a retirar en COP' })
  @IsNumber()
  @IsPositive()
  amount: number;
}
