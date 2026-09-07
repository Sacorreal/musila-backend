import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsEmail, IsNotEmpty, IsOptional, IsUUID, Matches } from 'class-validator';

export class CreateForeignBankInformationDto {
  @ApiProperty({ required: false, description: 'Id del BankInformationRequest a marcar como completado, si aplica.' })
  @IsOptional()
  @IsUUID()
  requestId?: string;

  @ApiProperty({ example: '+57', description: 'Indicativo de país' })
  @Matches(/^\+\d{1,4}$/, { message: 'El indicativo de país debe tener el formato +57' })
  countryCallingCode: string;

  @ApiProperty({ description: 'Número de teléfono registrado en Global66' })
  @Matches(/^\d{6,15}$/, { message: 'El número de teléfono debe tener entre 6 y 15 dígitos' })
  phoneNumber: string;

  @ApiProperty({ description: 'Correo electrónico registrado en Global66' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '@nombre', description: 'Nombre de usuario (@Nombre) registrado en Global66' })
  @IsNotEmpty()
  @Matches(/^@?[\w.]{3,32}$/, { message: 'Nombre de usuario de Global66 inválido' })
  global66Username: string;

  @ApiProperty({ description: 'Aceptación obligatoria de los avisos legales de pagos internacionales vía Global66' })
  @Equals(true, { message: 'Debes aceptar los avisos legales para continuar' })
  acceptedLegalNotice: boolean;
}
