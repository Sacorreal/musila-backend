import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDirectChatInput {
    @ApiProperty({
        example: '123e4567-e89b-12d3-a456-426614174000',
        description: 'ID del usuario con quien se inicia la conversación directa',
    })
    @IsUUID('4')
    targetUserId: string;
}
