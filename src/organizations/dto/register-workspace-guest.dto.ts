import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength } from 'class-validator';

/**
 * Registro de un invitado a partir de un enlace de workspace. Endpoint público
 * — el token del enlace actúa como mecanismo de autorización y valida el email
 * de forma implícita. Crea la cuenta y genera una solicitud de acceso pendiente.
 */
export class RegisterWorkspaceGuestDto {
  @ApiProperty({ description: 'Token del enlace de invitación del workspace' })
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

  @ApiProperty({ example: 'ana@ejemplo.com', description: 'Correo electrónico' })
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

  @ApiPropertyOptional({ example: 'CC', description: 'Tipo de documento' })
  @IsOptional()
  @IsString()
  typeCitizenID?: string;

  @ApiPropertyOptional({ example: '12345678', description: 'Número de documento' })
  @IsOptional()
  @IsString()
  citizenID?: string;

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
}
