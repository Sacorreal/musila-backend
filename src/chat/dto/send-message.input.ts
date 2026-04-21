import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class MessageInput {
    @IsUUID('4', { message: 'El userId debe ser un UUID v4 válido' })
    @IsNotEmpty({ message: 'El userId es obligatorio' })
    userId: string;

    @IsNotEmpty({ message: 'El chatId es obligatorio' })
    @IsString()
    chatId: string;

    @IsNotEmpty({ message: 'El contenido del mensaje' })
    @IsString()
    content: string;
}
