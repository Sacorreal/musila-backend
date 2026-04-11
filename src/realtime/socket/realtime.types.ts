import { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

/**
 * Payload de cada evento emitido desde el gateway a los clientes.
 * Tipado estricto para todos los eventos del sistema de notificaciones.
 */

export interface UserAddedToPlaylistPayload {
  playlistId: string;
  playlistTitle: string;
  guestId: string;
  guestName: string;
  guestEmail: string;
  permission: string;
  addedBy: string; // nombre del owner
}

export interface PlaylistUpdatedPayload {
  playlistId: string;
  playlistTitle: string;
  updatedBy: string;
  changes: string[]; // lista de campos modificados
}

export interface InviteAcceptedPayload {
  inviteToken: string;
  guestId: string;
  guestName: string;
  guestEmail: string;
  invitedById: string;
}

export interface CollaboratorJoinedPayload {
  playlistId: string;
  playlistTitle: string;
  guestId: string;
  guestName: string;
  joinedAt: Date;
}

/**
 * Eventos emitidos por el gateway (server → client)
 */
export enum NotificationEvent {
  USER_ADDED_TO_PLAYLIST = 'userAddedToPlaylist',
  PLAYLIST_UPDATED = 'playlistUpdated',
  INVITE_ACCEPTED = 'inviteAccepted',
  COLLABORATOR_JOINED = 'collaboratorJoined',
  // Eventos de sala
  ROOM_JOINED = 'roomJoined',
  ROOM_LEFT = 'roomLeft',
  // Errores
  AUTH_ERROR = 'authError',
}

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
