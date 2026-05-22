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
import { OnEvent } from '@nestjs/event-emitter';

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
      this.logger.warn('Usuario no autenticado intentó enviar mensaje por socket');
      client.emit('auth.error', { message: 'No autenticado' })
      return
    }

    try {
      await this.chatService.saveMessage(user.id, messageInput);
    } catch (error) {
      this.logger.error('Error procesando mensaje de chat:', error.message);
    }
  }

  @SubscribeMessage('chat.read')
  async handleReadMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    const user = this.socketAuth.getUserFromSocket(client);
    if (!user) return;
    await this.chatService.markAsRead({ chatId: data.chatId, userId: user.id });
  }

  // =====================================================
  // 📡 EVENT LISTENERS (INTERNAL → SOCKET)
  // =====================================================

  @OnEvent('chat.message.sent')
  handleMessageSent(payload: AppEventMap['chat.message.sent']) {
    this.emitToRoom(this.chatRoom(payload.chatId), 'chat.message.received', payload);
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