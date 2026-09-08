import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { ChatGateway } from './chat.gateway';
import { Chat } from './entities/chat.entity'
import { Message } from './entities/message.entity'
import { User } from 'src/users/entities/user.entity'
import { ChatService } from './chat.service'
import { ChatListener } from './chat.listener';
import { SocketAuthService } from 'src/shared/realtime/socket-auth.service';
import { Guest } from 'src/guests/entities/guest.entity';

import { ChatController } from './chat.controller';
import { ChatAdminController } from './chat-admin.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Chat, Message, Guest]),
    forwardRef(() => AuthModule),
  ],
  providers: [ChatService, ChatGateway, ChatListener, SocketAuthService],
  controllers: [ChatController, ChatAdminController],
  exports: [ChatService],
})
export class ChatModule { }
