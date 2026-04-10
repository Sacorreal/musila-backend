/**
 * INVITE CREATED
 */
export interface InviteCreatedPayload {
  email: string;
  token: string;
  invitedByName: string;
}

/**
 * INVITE ACCEPTED
 */
export interface InviteAcceptedPayload {
  email: string;
  name: string;
}

/**
 * PLAYLIST UPDATED
 */
export interface PlaylistUpdatedPayload {
  playlistId: string;
  action: 'SONG_ADDED' | 'SONG_REMOVED';
  songId?: string;
}

/**
 * USER REGISTER
 */
export interface UserRegisterPayload {
  email: string;
  name: string;
}