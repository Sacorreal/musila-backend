export type NotificationType =
  | 'INVITE_CREATED'
  | 'INVITE_ACCEPTED'
  | 'PLAYLIST_UPDATED'
  | 'USER_REGISTER';

export type NotificationChannelType = 'email' | 'sms' | 'push';

/**
 * Evento tipado genérico
 */
export interface NotificationEvent<TPayload = unknown> {
  type: NotificationType;
  payload: TPayload;
  channels: NotificationChannelType[];
}
