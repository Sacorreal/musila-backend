import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UserPlanType } from './entities/user-plan-type.enum';
import { MusicRole } from './entities/music-role.enum';
import { User } from './entities/user.entity';
import { StorageService } from '../shared/storage/storage.service';
import { CreatorIdService } from '../creator-id/creator-id.service';
import { Follow } from 'src/follows/entities/follow.entity';

import { PaginationDto } from '../shared/dto/pagination.dto';
import { FilterUserDto } from './dto/filter-user.dto';

const userRelations: string[] = [
  'tracks',
  'guests',
  'playlists',
  'requestSent',
  'preferredGenres',
];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(MusicalGenre)
    private readonly musicalGenreRepository: Repository<MusicalGenre>,
    @InjectRepository(Follow)
    private readonly followsRepository: Repository<Follow>,
    private readonly storageService: StorageService,
    private readonly creatorIdService: CreatorIdService,
  ) { }

  // =============================
  // Métodos Privados (DRY)
  // =============================

  private async findUserWithRelations(
    id: string,
    planType?: UserPlanType,
  ): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id, ...(planType && { planType }) },
      relations: userRelations,
    });
    if (!user) throw new NotFoundException('El usuario no existe');

    // Limpiar el ritmo del genre dentro de cada track
    // para evitar confusión con el ritmo propio del track
    if (user.tracks) {
      user.tracks = user.tracks.map((track) => {
        if (track.genre) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { ritmo: _, ...genreRest } = track.genre;
          track.genre = genreRest as MusicalGenre;
        }
        return track;
      });
    }

    return user;
  }

  private async saveAndReturnWithRelations(user: User): Promise<User> {
    const savedUser = await this.usersRepository.save(user);
    return this.findUserWithRelations(savedUser.id);
  }

  //Centraliza la lógica repetida de creación y actualización
  private async getValidatedGenres(
    genreIds?: string[],
  ): Promise<MusicalGenre[] | undefined> {
    if (!genreIds?.length) return undefined;
    if (genreIds.length > 3) {
      throw new BadRequestException(
        'El usuario no puede tener más de 3 géneros preferidos',
      );
    }
    return await this.musicalGenreRepository.findBy({ id: In(genreIds) });
  }

  // =============================
  // Métodos Públicos
  // =============================

  async createUserService({ preferredGenres, ...rest }: CreateUserInput) {
    const genres = await this.getValidatedGenres(preferredGenres);
    const musilaCreatorId = await this.creatorIdService.generateUnique();

    const newUser = this.usersRepository.create({
      ...rest,
      musilaCreatorId,
      ...(genres && { preferredGenres: genres }),
    });

    return this.saveAndReturnWithRelations(newUser);
  }

  async updateUserService(
    id: string,
    { preferredGenres, avatarKey, avatarUrl, ...rest }: UpdateUserInput,
    actingUser?: { planType: UserPlanType },
  ) {
    const existingUser = await this.findUserWithRelations(id);

    if (!existingUser) throw new NotFoundException('El usuario no existe');

    if (
      rest.planType === UserPlanType.SUPERADMIN &&
      actingUser?.planType !== UserPlanType.SUPERADMIN
    ) {
      throw new ForbiddenException('Solo un superadmin puede otorgar el rol superadmin');
    }

    const oldAvatarKey = existingUser.avatarKey;
    Object.assign(existingUser, rest);

    const genres = await this.getValidatedGenres(preferredGenres);
    if (genres) existingUser.preferredGenres = genres;

    if (avatarUrl && avatarKey) {
      existingUser.avatarKey = avatarKey;
      existingUser.avatarUrl = avatarUrl;
    }

    const updatedUser = await this.saveAndReturnWithRelations(existingUser);

    if (avatarKey && oldAvatarKey && oldAvatarKey !== avatarKey) {
      await this.storageService.deleteObject(oldAvatarKey);
    }
    return updatedUser;
  }

  async removeUserService(id: string) {
    const result = await this.usersRepository.softDelete(id);
    if (result.affected === 0)
      throw new NotFoundException('El usuario no existe');
    return { id, message: 'Usuario eliminado' };
  }

  async findOneUserByIdService(
    id: string,
    viewerId?: string,
  ): Promise<User & { followersCount: number; isFollowingByViewer: boolean }> {
    const user = await this.findUserWithRelations(id);

    const [followersCount, isFollowingByViewer] = await Promise.all([
      this.followsRepository.count({ where: { following: { id } } }),
      viewerId
        ? this.followsRepository.exists({
            where: { follower: { id: viewerId }, following: { id } },
          })
        : Promise.resolve(false),
    ]);

    return { ...user, followersCount, isFollowingByViewer };
  }

  async findAllUsersService(dto: FilterUserDto) {
    const { limit, offset, search, planType, isVerified } = dto;

    const qb = this.usersRepository
      .createQueryBuilder('u')
      .orderBy('u.createdAt', 'DESC')
      .take(Math.min(limit ?? 10, 100))
      .skip(offset);

    if (search) {
      qb.andWhere(
        '(u.name ILIKE :s OR u.last_name ILIKE :s OR u.email ILIKE :s)',
        { s: `%${search}%` },
      );
    }
    if (planType) qb.andWhere('u.planType = :planType', { planType });
    if (isVerified !== undefined) qb.andWhere('u.is_verified = :isVerified', { isVerified });

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findOneUserService(id: string) {
    return this.findUserWithRelations(id);
  }

  async findUserBycitizenIDService(citizenID: string) {
    return await this.usersRepository.findOne({
      where: { citizenID },
      select: ['id', 'email', 'password', 'planType', 'name', 'citizenID'],
    });
  }

  async findUserByEmailService(email: string) {
    return await this.usersRepository.findOne({
      where: { email },
      select: ['id', 'email', 'planType', 'name', 'password', 'isVerified'],
    });
  }

  getPlanTypesService() {
    return Object.values(UserPlanType);
  }

  getMusicRolesService() {
    return Object.values(MusicRole);
  }

  /** Búsqueda exacta por Musila Creator ID, usada para agregar coautores a un split. */
  async findByMusilaCreatorIdService(musilaCreatorId: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { musilaCreatorId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async findAllAuthorsService(planTypes: UserPlanType[], paginationDto: PaginationDto) {
    const { limit, offset } = paginationDto;
    const [data, total] = await this.usersRepository.findAndCount({
      where: { planType: In(planTypes) },
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });
    return { data, total };
  }

  async createAdminUserService(dto: CreateUserInput): Promise<User> {
    const exists = await this.usersRepository.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Ya existe un usuario con ese email');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    return this.createUserService({ ...dto, password: hashedPassword, planType: UserPlanType.ADMIN });
  }

  async deleteUserByIdService(id: string): Promise<{ id: string; message: string }> {
    const result = await this.usersRepository.softDelete(id);
    if (result.affected === 0) throw new NotFoundException('El usuario no existe');
    return { id, message: 'Usuario eliminado' };
  }

  async saveResetToken(userId: string, token: string, expires: Date) {
    await this.usersRepository.update(userId, {
      resetToken: token,
      resetTokenExpires: expires,
    });
  }

  async findUserByResetToken(token: string) {
    return await this.usersRepository.findOne({
      where: { resetToken: token },
      select: ['id', 'email', 'name', 'resetTokenExpires'],
    });
  }

  async resetPassword(userId: string, hashedPassword: string) {
    // Para setear valores a null, usamos un update directo.
    // También se puede usar this.usersRepository.save si necesitas hooks.
    await this.usersRepository.update(userId, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpires: null,
    } as any);
  }

  async saveEmailVerificationToken(userId: string, token: string, expires: Date) {
    await this.usersRepository.update(userId, {
      emailVerificationToken: token,
      emailVerificationTokenExpires: expires,
    });
  }

  async findUserByEmailVerificationToken(token: string) {
    return await this.usersRepository.findOne({
      where: { emailVerificationToken: token },
      select: ['id', 'email', 'name', 'isVerified', 'emailVerificationTokenExpires'],
    });
  }

  async markEmailAsVerified(userId: string) {
    await this.usersRepository.update(userId, {
      isVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpires: null,
    } as any);
  }
}
