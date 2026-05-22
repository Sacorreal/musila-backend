import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginAuthDto {
  @ApiProperty({
    example: '103299000',
    description: 'Número de documento registrado del usuario o invitado.',
  })
  @IsString()
  @IsNotEmpty()
  citizenID: string;

  @ApiProperty({
    example: 'password123',
    description: 'Contraseña del usuario o invitado.',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
