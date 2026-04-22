export interface AppEventMap {
  // 👥 INVITES
  'invite.created': {
    email: string;
    token: string;
    invitedByName: string;
  };

  'invite.accepted': {
    invitedById: string;
    playlistID: string;
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
  'user.invite.created': {
    name: string;
    email: string;
  };

  'event-test': {
    message: string;
  };

  //💬 CHAT 

  'chat.message.sent': {
    chatId: string;
    messageId: string;
    senderId?: string;
    content: string;
    titleTrack: string
  };

  'chat.guests.added': {
    chatId: string;
    guestIds: string[];
    addedBy: string;
    titleTrack: string;
    emailGuest: string[];
  }

  'chat.message.read': {
    chatId: string;
    messageId: string;
    userId: string;
    readAt: Date;
  };

  'chat.guests.removed': {
    chatId: string;
    guestIds: string[];
    removedBy: string;
  }


}
