import { LicenseType } from "src/requested-tracks/entities/license-type.enum";

export interface AppEventMap {
  // 👥 INVITES
  'invite.created': {
    email: string;
    token: string;
    invitedByName: string;
    guestName: string;
    inviteUrl: string;
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

  'user.password.reset.requested': {
    email: string;
    token: string;
    name: string;
  };

  'user.password.changed': {
    email: string;
    name: string;
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
    type: string;
    titleTrack: string;
    fileUrl?: string;
    fileKey?: string;
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
  };

  'chat.message.received': AppEventMap['chat.message.sent'];

  'chat.guests.added': {
    chatId: string;
    guestIds: string[];
    addedBy: string;
    titleTrack: string;
    emailGuest: string[];
  }

  'chat.message.read': {
    chatId: string;
    userId: string;
    readAt: Date;
  };

  'chat.guests.removed': {
    chatId: string;
    guestIds: string[];
    removedBy: string;
  }

  //🎶 traack

  'track.request.created': {
    chatId: string;
    requesterId: string;
    authorIds: string[];
    trackTitle: string;
    licenseType: LicenseType;
  }

  'track.request.updated': {
    requestId: string;
    chatId: string;
    trackTitle: string;
    status: string;
    requesterId: string;
    requesterEmail: string;
    requesterName: string;
  }


}
