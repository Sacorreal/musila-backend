import { NotificationListener } from './notification.listener';

describe('NotificationListener', () => {
  let listener: NotificationListener;
  let notificationsService: any;
  let notificationsGateway: any;
  let followsService: any;

  beforeEach(() => {
    notificationsService = {
      createNotification: jest.fn((data) => Promise.resolve({ id: 'notification-1', ...data })),
    };
    notificationsGateway = { emitToUser: jest.fn() };
    followsService = { getFollowerIds: jest.fn() };

    listener = new NotificationListener(notificationsService, notificationsGateway, followsService);
  });

  describe('handleTrackCreatedNotifyFollowers', () => {
    const payload = {
      trackId: 'track-1',
      audioKey: 'audio.mp3',
      trackTitle: 'Mi Canción',
      authorIds: ['author-1'],
    };

    it('crea y emite una notificación por cada seguidor del autor', async () => {
      followsService.getFollowerIds.mockResolvedValue(['follower-1', 'follower-2']);

      await listener.handleTrackCreatedNotifyFollowers(payload);

      expect(followsService.getFollowerIds).toHaveBeenCalledWith('author-1');
      expect(notificationsService.createNotification).toHaveBeenCalledTimes(2);
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: { id: 'follower-1' },
          type: 'track.published',
          link: `/music/tracks/${payload.trackId}`,
        }),
      );
      expect(notificationsGateway.emitToUser).toHaveBeenCalledWith(
        'follower-1',
        'notification.received',
        expect.objectContaining({ id: 'notification-1' }),
      );
      expect(notificationsGateway.emitToUser).toHaveBeenCalledWith(
        'follower-2',
        'notification.received',
        expect.anything(),
      );
    });

    it('no notifica a nadie si el autor no tiene seguidores', async () => {
      followsService.getFollowerIds.mockResolvedValue([]);

      await listener.handleTrackCreatedNotifyFollowers(payload);

      expect(notificationsService.createNotification).not.toHaveBeenCalled();
      expect(notificationsGateway.emitToUser).not.toHaveBeenCalled();
    });

    it('no propaga el error si falla la resolución de seguidores', async () => {
      followsService.getFollowerIds.mockRejectedValue(new Error('db down'));

      await expect(listener.handleTrackCreatedNotifyFollowers(payload)).resolves.toBeUndefined();
    });
  });
});
