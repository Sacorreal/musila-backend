import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatGateway } from './chat.gateway';
import { Chat } from './entities/chat.entity'
import { Message } from './entities/message.entity'
import { User } from 'src/users/entities/user.entity'
import { ChatService } from './chat.service'
import { ChatListener } from './chat.listener';
import { SocketAuthService } from 'src/shared/realtime/socket-auth.service';
import { Guest } from 'src/guests/entities/guest.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Chat, Message, Guest])],
  providers: [ChatService, ChatGateway, ChatListener, SocketAuthService],
  exports: [ChatService],
})
export class ChatModule { }
