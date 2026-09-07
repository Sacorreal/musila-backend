import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectCommissionDto {
  @ApiProperty({ example: 'Pago original reembolsado por el cliente' })
  @IsString()
  @IsNotEmpty({ message: 'El motivo de rechazo es obligatorio' })
  reason: string;
}
