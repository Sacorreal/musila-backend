import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateGuestInput {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Identificador único (UUID) del usuario que realizó la invitación.'
  })
  @IsUUID()
  invitedById: string
}
