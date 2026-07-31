import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectLicenseSignatoryDto {
  @ApiProperty({ example: 'El anticipo pactado no corresponde a lo acordado', description: 'Motivo del rechazo' })
  @IsString({ message: 'El motivo debe ser un texto válido' })
  @IsNotEmpty({ message: 'El motivo del rechazo es obligatorio' })
  @MaxLength(500, { message: 'El motivo no puede superar 500 caracteres' })
  reason: string;
}
