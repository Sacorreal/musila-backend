import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FollowsService } from './follows.service';
import { MusicRole } from 'src/users/entities/music-role.enum';

describe('FollowsService', () => {
  let service: FollowsService;
  let followsRepo: any;
  let usersRepo: any;

  const composer = { id: 'composer-1', role: MusicRole.COMPOSITOR };
  const singerSongwriter = { id: 'cantautor-1', role: MusicRole.CANTAUTOR };
  const producer = { id: 'producer-1', role: MusicRole.PRODUCTOR };

  beforeEach(() => {
    followsRepo = {
      exists: jest.fn().mockResolvedValue(false),
      insert: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      count: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockResolvedValue([]),
    };
    usersRepo = { findOne: jest.fn() };

    service = new FollowsService(followsRepo, usersRepo);
  });

  describe('follow', () => {
    it('rechaza seguirse a sí mismo', async () => {
      await expect(service.follow('user-1', 'user-1')).rejects.toThrow(BadRequestException);
      expect(usersRepo.findOne).not.toHaveBeenCalled();
    });

    it('rechaza si el usuario a seguir no existe', async () => {
      usersRepo.findOne.mockResolvedValue(null);

      await expect(service.follow('follower-1', 'ghost-1')).rejects.toThrow(NotFoundException);
    });

    it('rechaza seguir a un usuario con rol no permitido', async () => {
      usersRepo.findOne.mockResolvedValue(producer);

      await expect(service.follow('follower-1', producer.id)).rejects.toThrow(BadRequestException);
      expect(followsRepo.insert).not.toHaveBeenCalled();
    });

    it('permite seguir a un COMPOSITOR', async () => {
      usersRepo.findOne.mockResolvedValue(composer);

      await service.follow('follower-1', composer.id);

      expect(followsRepo.insert).toHaveBeenCalledWith({
        follower: { id: 'follower-1' },
        following: { id: composer.id },
      });
    });

    it('permite seguir a un CANTAUTOR', async () => {
      usersRepo.findOne.mockResolvedValue(singerSongwriter);

      await service.follow('follower-1', singerSongwriter.id);

      expect(followsRepo.insert).toHaveBeenCalled();
    });

    it('es idempotente si ya sigue al usuario', async () => {
      usersRepo.findOne.mockResolvedValue(composer);
      followsRepo.exists.mockResolvedValue(true);

      await service.follow('follower-1', composer.id);

      expect(followsRepo.insert).not.toHaveBeenCalled();
    });
  });

  describe('unfollow', () => {
    it('elimina la relación de seguimiento', async () => {
      await service.unfollow('follower-1', 'following-1');

      expect(followsRepo.delete).toHaveBeenCalledWith({
        follower: { id: 'follower-1' },
        following: { id: 'following-1' },
      });
    });
  });

  describe('isFollowing', () => {
    it('delega en el repositorio', async () => {
      followsRepo.exists.mockResolvedValue(true);

      await expect(service.isFollowing('follower-1', 'following-1')).resolves.toBe(true);
    });
  });

  describe('countFollowers', () => {
    it('cuenta los seguidores de un usuario', async () => {
      followsRepo.count.mockResolvedValue(42);

      await expect(service.countFollowers('user-1')).resolves.toBe(42);
      expect(followsRepo.count).toHaveBeenCalledWith({ where: { following: { id: 'user-1' } } });
    });
  });

  describe('getFollowerIds', () => {
    it('retorna los ids de los seguidores', async () => {
      followsRepo.find.mockResolvedValue([
        { follower: { id: 'follower-1' } },
        { follower: { id: 'follower-2' } },
      ]);

      await expect(service.getFollowerIds('following-1')).resolves.toEqual(['follower-1', 'follower-2']);
    });
  });
});
