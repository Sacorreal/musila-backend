import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class AuthorizeRecipientDto {
  @ApiProperty({
    description: 'Musila Creator ID del usuario a autorizar',
    example: 'MC-1A2B3C',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^MC-[A-Z0-9]{6}$/, {
    message: 'musilaCreatorId debe tener el formato MC-XXXXXX',
  })
  musilaCreatorId: string;
}
