import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class AuthorizeRecipientDto {
  @ApiProperty({
    description: 'Nombre de usuario (sin @) a autorizar',
    example: 'Nombre123',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Za-z0-9_]{3,20}$/, {
    message: 'El nombre de usuario debe tener entre 3 y 20 caracteres (letras, números y guion bajo)',
  })
  username: string;
}
