import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { SocketAuthService } from 'src/shared/realtime/socket-auth.service';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly socketAuth: SocketAuthService) {}

  async handleConnection(client: Socket) {
    try {
      await this.socketAuth.authenticate(client);
      const user = this.socketAuth.getUserFromSocket(client);
      
      if (user) {
        const room = this.userRoom(user.id);
        await client.join(room);
        this.logger.log(`🔔 Usuario unido a notificaciones: ${user.id}`);
      }
    } catch (error) {
      this.logger.error('Error autenticando socket de notificaciones', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.socketAuth.onDisconnect(client);
  }

  // =====================================================
  // 📡 SERVER → CLIENT
  // =====================================================

  emitToUser(userId: string, event: string, payload: any) {
    this.server.to(this.userRoom(userId)).emit(event, payload);
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }
}
