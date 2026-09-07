import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectWithdrawalDto {
  @ApiProperty({ example: 'La cuenta bancaria informada no es válida' })
  @IsString()
  @IsNotEmpty({ message: 'El motivo de rechazo es obligatorio' })
  reason: string;
}
