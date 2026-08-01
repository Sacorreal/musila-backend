import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MusicRole } from 'src/users/entities/music-role.enum';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { Follow } from './entities/follow.entity';

const FOLLOWABLE_ROLES = [MusicRole.COMPOSITOR, MusicRole.CANTAUTOR];

@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(Follow)
    private readonly followsRepository: Repository<Follow>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async follow(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) {
      throw new BadRequestException('No puedes seguirte a ti mismo');
    }

    const following = await this.usersRepository.findOne({
      where: { id: followingId },
    });
    if (!following) {
      throw new NotFoundException('El usuario a seguir no existe');
    }
    if (!FOLLOWABLE_ROLES.includes(following.role)) {
      throw new BadRequestException(
        'Solo puedes seguir a usuarios con rol compositor o cantautor',
      );
    }

    const alreadyFollowing = await this.isFollowing(followerId, followingId);
    if (alreadyFollowing) return;

    await this.followsRepository.insert({
      follower: { id: followerId } as any,
      following: { id: followingId } as any,
    });
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    await this.followsRepository.delete({
      follower: { id: followerId } as User,
      following: { id: followingId } as User,
    });
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    return this.followsRepository.exists({
      where: {
        follower: { id: followerId },
        following: { id: followingId },
      },
    });
  }

  async countFollowers(userId: string): Promise<number> {
    return this.followsRepository.count({
      where: { following: { id: userId } },
    });
  }

  async getFollowerIds(followingId: string): Promise<string[]> {
    const follows = await this.followsRepository.find({
      where: { following: { id: followingId } },
      relations: ['follower'],
    });
    return follows.map((follow) => follow.follower.id);
  }
}
