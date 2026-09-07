import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectBusinessRegistrationDto {
  @ApiProperty({ example: 'El nombre legal no coincide con el documento aportado' })
  @IsString()
  @IsNotEmpty({ message: 'El motivo del rechazo es obligatorio' })
  @MaxLength(500)
  reason: string;
}
