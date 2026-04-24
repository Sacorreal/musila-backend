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
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { MessageInput } from './dto/send-message.input';
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
    await client.join(this.chatRoom(data.chatId));

    this.logger.log(`👥 Usuario unido al chat: ${data.chatId}`);
  }

  // =====================================================
  // 💬 CLIENT → SERVER
  // =====================================================

  @SubscribeMessage(ClientChatEvent.SEND_MESSAGE)
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() messageInput: MessageInput,
  ) {
    const user = this.socketAuth.getUserFromSocket(client)

    if (!user) {
      console.error('[ChatGateway] Usuario no autenticado en socket');
      client.emit('auth.error', { message: 'No autenticado' })
      return
    }

    try {
      await this.chatService.saveMessage(user.id, messageInput);
    } catch (error) {
      console.error('[ChatGateway] Error procesando mensaje:', error.message);
    }
  }

  @SubscribeMessage('chat.read')
  handleReadMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string; messageId: string },
  ) {
    const user = this.socketAuth.getUserFromSocket(client);

    if (!user) return;
    this.chatService.markAsRead({
      chatId: data.chatId,
      messageId: data.messageId,
      userId: user.id,
    });
  }

  // =====================================================
  // 📡 SERVER → CLIENT
  // =====================================================

  emitToRoom<T extends keyof AppEventMap>(
    room: string,
    event: T,
    payload: AppEventMap[T],
  ) {
    this.server.to(room).emit(event, payload);
  }

  private chatRoom(chatId: string) {
    return `chat:${chatId}`;
  }

}