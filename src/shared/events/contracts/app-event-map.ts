import {UserRole } from 'src/users/entities/user-role.enum'

export interface AppEventMap {
  'notification.invite.created': {
    email: string;
    token: string;
    invitedByName: string;
  };

  'notification.invite.accepted': {
    email: string;
    name: string;
  };

  'notification.playlist.updated': {
    playlistId: string;
    action: 'SONG_ADDED' | 'SONG_REMOVED';
    songId?: string;
  };

  'notification.user.created':{
    name: string; 
    role: UserRole, 
    email: string
  }; 

  'event-test': {
    message: string
  }
}