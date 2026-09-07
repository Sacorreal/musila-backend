import { FollowsController } from './follows.controller';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UserPlanType } from 'src/users/entities/user-plan-type.enum';

describe('FollowsController', () => {
  let controller: FollowsController;
  let service: any;

  const user: JwtPayload = { id: 'follower-1', email: 'f@musila.com', name: 'Follower', planType: UserPlanType.PLAN_AUTOR };

  beforeEach(() => {
    service = {
      follow: jest.fn().mockResolvedValue(undefined),
      unfollow: jest.fn().mockResolvedValue(undefined),
      isFollowing: jest.fn().mockResolvedValue(true),
    };
    controller = new FollowsController(service);
  });

  it('sigue a un usuario y forwardea el id del usuario autenticado', async () => {
    const result = await controller.followController('artist-1', user);

    expect(service.follow).toHaveBeenCalledWith(user.id, 'artist-1');
    expect(result).toEqual({ isFollowing: true });
  });

  it('deja de seguir a un usuario', async () => {
    const result = await controller.unfollowController('artist-1', user);

    expect(service.unfollow).toHaveBeenCalledWith(user.id, 'artist-1');
    expect(result).toEqual({ isFollowing: false });
  });

  it('retorna el estado de seguimiento', async () => {
    const result = await controller.statusController('artist-1', user);

    expect(service.isFollowing).toHaveBeenCalledWith(user.id, 'artist-1');
    expect(result).toEqual({ isFollowing: true });
  });
});
