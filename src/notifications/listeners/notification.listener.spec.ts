import { NotificationListener } from './notification.listener';
import { MembershipStatus } from 'src/organizations/entities/membership-status.enum';

describe('NotificationListener', () => {
  let listener: NotificationListener;
  let notificationsService: any;
  let notificationsGateway: any;
  let followsService: any;
  let organizationMembershipRepo: any;
  let membershipRoleRepo: any;

  beforeEach(() => {
    notificationsService = {
      createNotification: jest.fn((data) => Promise.resolve({ id: 'notification-1', ...data })),
    };
    notificationsGateway = { emitToUser: jest.fn() };
    followsService = { getFollowerIds: jest.fn() };
    organizationMembershipRepo = { find: jest.fn().mockResolvedValue([]) };
    membershipRoleRepo = { find: jest.fn().mockResolvedValue([]) };

    listener = new NotificationListener(
      notificationsService,
      notificationsGateway,
      followsService,
      organizationMembershipRepo,
      membershipRoleRepo,
    );
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

  describe('handleAccessRequestCreated', () => {
    const payload = { organizationId: 'org-1', requesterUserId: 'user-2', accessRequestId: 'req-1' };

    it('notifica a los miembros ACTIVE con rol ORGANIZATION_ADMIN', async () => {
      organizationMembershipRepo.find.mockResolvedValue([
        { id: 'membership-1', userId: 'admin-1', status: MembershipStatus.ACTIVE },
        { id: 'membership-2', userId: 'staff-1', status: MembershipStatus.ACTIVE },
      ]);
      membershipRoleRepo.find.mockResolvedValue([
        { membershipId: 'membership-1', role: { key: 'ORGANIZATION_ADMIN' } },
        { membershipId: 'membership-2', role: { key: 'FINANCE' } },
      ]);

      await listener.handleAccessRequestCreated(payload);

      expect(notificationsService.createNotification).toHaveBeenCalledTimes(1);
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ recipient: { id: 'admin-1' }, type: 'organization.access_request.created' }),
      );
      expect(notificationsGateway.emitToUser).toHaveBeenCalledWith(
        'admin-1',
        'notification.received',
        expect.anything(),
      );
    });

    it('no notifica a nadie si la organización no tiene admins', async () => {
      organizationMembershipRepo.find.mockResolvedValue([]);

      await listener.handleAccessRequestCreated(payload);

      expect(notificationsService.createNotification).not.toHaveBeenCalled();
    });

    it('no propaga el error si falla la resolución de admins', async () => {
      organizationMembershipRepo.find.mockRejectedValue(new Error('db down'));

      await expect(listener.handleAccessRequestCreated(payload)).resolves.toBeUndefined();
    });
  });
});
