import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { MessageType } from '../types/chat.types';
import { IsOptional } from '@nestjs/class-validator';

export class MessageInput {

  @IsNotEmpty({ message: 'El chatId es obligatorio' })
  @IsString()
  chatId: string;

  @IsNotEmpty({ message: 'El contenido del mensaje' })
  @IsString()
  content: string;

  @IsEnum(MessageType)
  type: MessageType;

  @IsOptional()
  @IsString()
  filekey?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string
}
