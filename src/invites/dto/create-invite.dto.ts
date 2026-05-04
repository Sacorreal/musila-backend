import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateInviteDto {
  @ApiProperty({
    description: 'Correo electrónico del destinatario de la invitación',
    example: 'colaborador@example.com',
  })
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Nombre de la persona invitada',
    example: 'Juan',
  })
  @IsNotEmpty()
  @IsString()
  guestName: string;
}
