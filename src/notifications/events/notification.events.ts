import {
  InviteCreatedPayload,
  InviteAcceptedPayload,
  PlaylistUpdatedPayload,
  UserRegisterPayload,
} from '../types/event-payloads';
export const NotificationEvents = {
  INVITE_CREATED: 'notification.invite.created',
  INVITE_ACCEPTED: 'notification.invite.accepted',
  PLAYLIST_UPDATED: 'notification.playlist.updated',
  USER_REGISTER: 'notification.user.created',  
} as const;

export interface NotificationEventMap {
  [NotificationEvents.INVITE_CREATED]: InviteCreatedPayload;
  [NotificationEvents.INVITE_ACCEPTED]: InviteAcceptedPayload;
  [NotificationEvents.PLAYLIST_UPDATED]: PlaylistUpdatedPayload;
  [NotificationEvents.USER_REGISTER]: UserRegisterPayload;
}


