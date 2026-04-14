export interface AppEventMap {
  // 👥 INVITES
  'invite.created': {
    email: string;
    token: string;
    invitedByName: string;
  };
  
  // 🎵 PLAYLIST
  'playlist.updated': {
    playlistId: string;
    playlistTitle: string;
    updatedBy: string;
    changes: string[];
  };

  'playlist.user.added': {
    playlistId: string;
    playlistTitle: string;
    guestId: string;
    guestName: string;
    guestEmail: string;
    permission: string;
    addedBy: string;
  };


   // 👤 USER
  'user.invite.created':{
    name: string;     
    email: string
  }; 

  'event-test': {
    message: string
  }
}