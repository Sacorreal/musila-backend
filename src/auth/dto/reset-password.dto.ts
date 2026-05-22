import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'token123',
    description: 'Token enviado al correo electrónico',
  })
  @IsString({ message: 'El token debe ser un string' })
  @IsNotEmpty({ message: 'El token es requerido' })
  token: string;

  @ApiProperty({
    example: 'NewPassword123!',
    description: 'La nueva contraseña',
    minLength: 6,
  })
  @IsString({ message: 'La nueva contraseña debe ser un string' })
  @IsNotEmpty({ message: 'La nueva contraseña es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  newPassword: string;

  @ApiProperty({
    example: 'NewPassword123!',
    description: 'Confirmación de la nueva contraseña',
    minLength: 6,
  })
  @IsString({ message: 'La confirmación debe ser un string' })
  @IsNotEmpty({ message: 'La confirmación es requerida' })
  confirmPassword: string;
}
