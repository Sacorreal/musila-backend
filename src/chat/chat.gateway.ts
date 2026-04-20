import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: '*',
  },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) { }

  // =====================================================
  // 🔌 JOIN ROOM
  // =====================================================

  @SubscribeMessage('joinChat')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    const room = `chat:${data.chatId}`;
    client.join(room);
  }

  // =====================================================
  // 💬 SEND MESSAGE
  // =====================================================

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      chatId: string;
      senderId: string;
      content: string;
    },
  ) {
    const message = await this.chatService.saveMessage(data);

    const room = `chat:${data.chatId}`;

    this.server.to(room).emit('chat.message', message);
  }
}