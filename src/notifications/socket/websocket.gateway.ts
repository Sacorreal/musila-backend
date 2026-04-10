import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import {
  AuthenticatedSocket,
  ClientEvent,
  CollaboratorJoinedPayload,
  InviteAcceptedPayload,
  NotificationEvent,
  PlaylistUpdatedPayload,
  UserAddedToPlaylistPayload,
} from '../notifications.types';

/**
 * WebSocket Gateway para notificaciones en tiempo real.
 *
 * Arquitectura de rooms: cada playlist tiene un room nombrado `playlist:{id}`.
 * Los colaboradores se unen al room al conectarse o bajo demanda.
 *
 * Escalabilidad: listo para Redis Adapter — el server.to(room).emit()
 * funciona de forma transparente con @socket.io/redis-adapter sin
 * cambios en este código.
 */
@WebSocketGateway({
  cors: {
    origin: [
      process.env.WEB_APP_PRODUCTION,
      process.env.WEB_APP_DEVELOPMENT,
      process.env.WEB_APP_LOCAL,
    ].filter(Boolean) as string[],
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // Lifecycle hooks
  // ─────────────────────────────────────────────────────────────────────────────

  afterInit() {
    this.logger.log('🔌 NotificationsGateway inicializado — namespace: /notifications');
  }

  /**
   * Cuando un cliente se conecta, validamos el JWT antes de aceptar la conexión.
   * El token se extrae desde:
   *   1. auth.token  (handshake.auth.token — recomendado para Socket.io v4)
   *   2. Authorization header como Bearer token (fallback para clientes HTTP)
   */
  async handleConnection(client: Socket) {
    try {
      const token = this.extractTokenFromHandshake(client);

      if (!token) {
        this.rejectConnection(client, 'Token de autenticación no encontrado');
        return;
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      // Almacenamos el payload en el socket para accederlo en eventos sin re-verificar
      (client as unknown as AuthenticatedSocket).data = { user: payload };

      this.logger.log(`✅ Cliente conectado: [${client.id}] — Usuario: ${payload.name} (${payload.id})`);
    } catch {
      this.rejectConnection(client, 'Token inválido o expirado');
    }
  }

  handleDisconnect(client: Socket) {
    const user = this.getUserFromSocket(client);
    this.logger.log(
      `❌ Cliente desconectado: [${client.id}]${user ? ` — Usuario: ${user.name}` : ''}`,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Eventos cliente → servidor
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * El cliente solicita unirse al room de notificaciones de una playlist.
   * Client payload: { playlistId: string }
   */
  @SubscribeMessage(ClientEvent.JOIN_PLAYLIST_ROOM)
  async handleJoinPlaylistRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { playlistId: string },
  ) {
    const user = this.getUserFromSocket(client);
    if (!user) {
      client.emit(NotificationEvent.AUTH_ERROR, { message: 'No autenticado' });
      return;
    }

    const room = this.playlistRoom(data.playlistId);
    await client.join(room);

    this.logger.log(`🏠 ${user.name} se unió al room: ${room}`);

    client.emit(NotificationEvent.ROOM_JOINED, {
      room,
      playlistId: data.playlistId,
    });
  }

  /**
   * El cliente abandona el room de una playlist.
   * Client payload: { playlistId: string }
   */
  @SubscribeMessage(ClientEvent.LEAVE_PLAYLIST_ROOM)
  async handleLeavePlaylistRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { playlistId: string },
  ) {
    const user = this.getUserFromSocket(client);
    if (!user) return;

    const room = this.playlistRoom(data.playlistId);
    await client.leave(room);

    this.logger.log(`🚪 ${user.name} salió del room: ${room}`);

    client.emit(NotificationEvent.ROOM_LEFT, {
      room,
      playlistId: data.playlistId,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Métodos de emisión — llamados desde Services
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Notifica a todos los miembros de una playlist que se agregó un nuevo colaborador.
   * Llamado desde: PlaylistCollaboratorsService.addCollaborator()
   */
  emitUserAddedToPlaylist(payload: UserAddedToPlaylistPayload): void {
    const room = this.playlistRoom(payload.playlistId);
    this.server.to(room).emit(NotificationEvent.USER_ADDED_TO_PLAYLIST, payload);
    this.logger.log(`📢 [${NotificationEvent.USER_ADDED_TO_PLAYLIST}] → room: ${room}`);
  }

  /**
   * Notifica a todos los miembros de una playlist que fue actualizada.
   * Llamado desde: PlaylistsService.updatePlaylistsService()
   */
  emitPlaylistUpdated(payload: PlaylistUpdatedPayload): void {
    const room = this.playlistRoom(payload.playlistId);
    this.server.to(room).emit(NotificationEvent.PLAYLIST_UPDATED, payload);
    this.logger.log(`📢 [${NotificationEvent.PLAYLIST_UPDATED}] → room: ${room}`);
  }

  /**
   * Notifica al usuario invitante que su invitación fue usada.
   * Llamado desde: GuestsService.registerFromInvite()
   * Se emite al socket personal del usuario invitante, si está conectado.
   */
  emitInviteAccepted(payload: InviteAcceptedPayload): void {
    // Emite al room del usuario invitante (que también puede ser user:{id})
    const room = this.userRoom(payload.invitedById);
    this.server.to(room).emit(NotificationEvent.INVITE_ACCEPTED, payload);
    this.logger.log(`📢 [${NotificationEvent.INVITE_ACCEPTED}] → room: ${room}`);
  }

  /**
   * Notifica a todos los miembros de la playlist que un colaborador se unió al room.
   * Llamado desde: handleJoinPlaylistRoom o al registrarse como colaborador.
   */
  emitCollaboratorJoined(payload: CollaboratorJoinedPayload): void {
    const room = this.playlistRoom(payload.playlistId);
    this.server.to(room).emit(NotificationEvent.COLLABORATOR_JOINED, payload);
    this.logger.log(`📢 [${NotificationEvent.COLLABORATOR_JOINED}] → room: ${room}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Métodos privados auxiliares
  // ─────────────────────────────────────────────────────────────────────────────

  /** Construye el nombre canónico de room para una playlist */
  private playlistRoom(playlistId: string): string {
    return `playlist:${playlistId}`;
  }

  /** Construye el room personal de un usuario (para notificaciones directas) */
  private userRoom(userId: string): string {
    return `user:${userId}`;
  }

  /** Extrae el JWT del handshake. Soporta auth.token y Authorization header. */
  private extractTokenFromHandshake(client: Socket): string | undefined {
    // Opción 1: handshake.auth.token (socket.io v4 — recomendado)
    const authToken = client.handshake.auth?.token as string | undefined;
    if (authToken) return authToken;

    // Opción 2: Authorization header Bearer (fallback)
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer' && token) return token;
    }

    return undefined;
  }

  /** Obtiene el JwtPayload almacenado en el socket tras la autenticación */
  private getUserFromSocket(client: Socket): JwtPayload | null {
    return (client as unknown as AuthenticatedSocket).data?.user ?? null;
  }

  /** Rechaza la conexión emitiendo el error y desconectando al cliente */
  private rejectConnection(client: Socket, message: string): void {
    this.logger.warn(`🚫 Conexión rechazada [${client.id}]: ${message}`);
    client.emit(NotificationEvent.AUTH_ERROR, { message });
    client.disconnect(true);
  }
}
