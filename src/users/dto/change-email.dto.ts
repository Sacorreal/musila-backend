import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ChangeEmailDto {
  @ApiProperty({ example: 'nuevo@correo.com' })
  @IsEmail()
  newEmail: string;
}
