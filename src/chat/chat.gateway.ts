import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { Logger } from '@nestjs/common';
import { ClientChatEvent } from './types/chat.types';
import { SocketAuthService } from 'src/shared/realtime/socket-auth.service';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly socketAuth: SocketAuthService,
  ) { }

  async handleConnection(client: Socket) {
    await this.socketAuth.authenticate(client)
  }

  handleDisconnect(client: Socket) {
    this.socketAuth.onDisconnect(client)
  }

  // =====================================================
  // 🔌 JOIN ROOM
  // =====================================================

  @SubscribeMessage(ClientChatEvent.JOIN_CHAT)
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    const room = this.chatRoom(data.chatId);
    await client.join(room);

    this.logger.log(`👥 Usuario unido al chat: ${room}`);
  }

  // =====================================================
  // 💬 CLIENT → SERVER
  // =====================================================

  @SubscribeMessage(ClientChatEvent.SEND_MESSAGE)
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      chatId: string;
      content: string;
    },
  ) {
    const user = this.socketAuth.getUserFromSocket(client)

    if (!user) {
      client.emit('auth.error', { message: 'No autenticado' })
      return
    }
    await this.chatService.saveMessage({
      userId: user.id,
      chatId: data.chatId,
      content: data.content,
    });
  }

  // =====================================================
  // 📡 SERVER → CLIENT
  // =====================================================

  emitMessage(payload: {
    chatId: string;
    messageId: string;
    senderId: string;
    content: string;
  }) {
    const room = this.chatRoom(payload.chatId);

    this.server.to(room).emit('chat.message', payload);
  }

  // =====================================================
  // 🧰 HELPERS
  // =====================================================

  private chatRoom(chatId: string) {
    return `chat:${chatId}`;
  }
}