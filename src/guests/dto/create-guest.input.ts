import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateGuestInput {
  @ApiProperty({ example: '', description: '' })
  @IsUUID()
  invitedById: string
}
