import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatGateway } from './chat.gateway';
import { Chat } from './entities/chat.entity'
import { Message } from './entities/message.entity'
import { User } from 'src/users/entities/user.entity'
import { ChatService } from './chat.service'

@Module({
  imports: [TypeOrmModule.forFeature([User, Chat, Message])],
  providers: [ChatService, ChatGateway],
  exports: [ChatService],
})
export class ChatModule { }
