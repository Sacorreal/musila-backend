import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterFromInviteDto {
  @ApiProperty({ example: 'a1b2c3d4e5f6...', description: 'Token de invitación recibido' })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty({ example: 'Juan', description: 'Nombre del invitado' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Pérez', description: 'Apellido del invitado' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'juan.perez@email.com', description: 'Correo electrónico' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MiPassword123!', description: 'Contraseña (mín. 6 caracteres)' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: '+54', description: 'Código de país' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ example: '2615551234', description: 'Número de teléfono' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'DNI', description: 'Tipo de documento de identidad' })
  @IsOptional()
  @IsString()
  typeCitizenID?: string;

  @ApiPropertyOptional({ example: '40123456', description: 'Número de documento' })
  @IsOptional()
  @IsString()
  citizenID?: string;
}
