import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

/**
 * Registro del Organization Admin a partir de un token de invitación.
 * Endpoint público — el token actúa como mecanismo de autorización.
 */
export class RegisterOrgAdminDto {
  @ApiProperty({ example: 'a1b2c3d4e5f6...', description: 'Token de invitación recibido por email' })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty({ example: 'Ana', description: 'Nombre' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Ruiz', description: 'Apellido' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'admin@sonymusic.com', description: 'Correo electrónico (debe coincidir con la invitación)' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Nombre123',
    description: 'Nombre de usuario único (sin @), 3 a 20 caracteres: letras, números y guion bajo.',
  })
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio' })
  @IsString()
  @Matches(/^[A-Za-z0-9_]{3,20}$/, {
    message: 'El nombre de usuario debe tener entre 3 y 20 caracteres (letras, números y guion bajo)',
  })
  username: string;

  @ApiProperty({ example: 'MiPassword123!', description: 'Contraseña (mín. 6 caracteres)' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'MiPassword123!', description: 'Repetición de la contraseña' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  repeatPassword: string;

  @ApiPropertyOptional({ example: '+57', description: 'Código de país' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ example: '3001234567', description: 'Número de teléfono' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'CC', description: 'Tipo de documento' })
  @IsOptional()
  @IsString()
  typeCitizenID?: string;

  @ApiPropertyOptional({ example: '12345678', description: 'Número de documento' })
  @IsOptional()
  @IsString()
  citizenID?: string;
}
