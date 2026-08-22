import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class PayWithdrawalsBatchDto {
  @ApiProperty({ type: [String], example: ['b3f1c2a0-...', 'a7e2d4b1-...'] })
  @IsArray()
  @ArrayNotEmpty({ message: 'Debes seleccionar al menos un retiro' })
  @IsUUID('4', { each: true })
  ids: string[];
}
