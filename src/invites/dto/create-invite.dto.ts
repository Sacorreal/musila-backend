import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateInviteDto {
  @ApiPropertyOptional({
    description: 'Correo electrónico del destinatario de la invitación (opcional)',
    example: 'colaborador@example.com',
  })
  @IsOptional()
  @IsString()
  @IsEmail()
  email?: string;
}
