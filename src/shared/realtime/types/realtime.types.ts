import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

/**
 * Eventos escuchados por el gateway (client → server)
 */
export enum ClientEvent {
  JOIN_PLAYLIST_ROOM = 'joinPlaylistRoom',
  LEAVE_PLAYLIST_ROOM = 'leavePlaylistRoom',
}

/**
 * Socket autenticado — extiende el socket de Socket.io con el payload del usuario
 */
export interface AuthenticatedSocket extends Record<string, unknown> {
  data: {
    user: JwtPayload;
  };
}
