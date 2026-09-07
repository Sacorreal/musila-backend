import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { In, QueryFailedError, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UserPlanType } from './entities/user-plan-type.enum';
import { MusicRole } from './entities/music-role.enum';
import { User } from './entities/user.entity';
import { StorageService } from '../shared/storage/storage.service';
import { UsernameService } from '../username/username.service';
import { AuthorizationService } from 'src/authorization/authorization.service';
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
    private readonly usernameService: UsernameService,
    private readonly authorizationService: AuthorizationService,
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

  /**
   * Convierte la violación del índice único case-insensitive de username
   * (`UQ_users_username_lower`) en un error de negocio legible. Es la fuente
   * de verdad de la unicidad: el chequeo previo de `UsernameService.isAvailable`
   * solo da feedback rápido en la UI, pero no evita una condición de carrera
   * entre dos solicitudes concurrentes eligiendo el mismo username.
   */
  private rethrowIfUsernameTaken(error: unknown): never {
    const pgError = error as { code?: string; constraint?: string };
    if (
      error instanceof QueryFailedError &&
      pgError.code === '23505' &&
      pgError.constraint === 'UQ_users_username_lower'
    ) {
      throw new ConflictException('Ese nombre de usuario ya está en uso');
    }
    throw error;
  }

  async createUserService({ preferredGenres, username, ...rest }: CreateUserInput) {
    const genres = await this.getValidatedGenres(preferredGenres);
    const normalizedUsername = this.usernameService.normalize(username);

    const isAvailable = await this.usernameService.isAvailable(normalizedUsername);
    if (!isAvailable) {
      throw new ConflictException('Ese nombre de usuario ya está en uso');
    }

    const newUser = this.usersRepository.create({
      ...rest,
      username: normalizedUsername,
      ...(genres && { preferredGenres: genres }),
    });

    try {
      return await this.saveAndReturnWithRelations(newUser);
    } catch (error) {
      this.rethrowIfUsernameTaken(error);
    }
  }

  async updateUserService(
    id: string,
    { preferredGenres, avatarKey, avatarUrl, username, ...rest }: UpdateUserInput,
    actingUser?: { id?: string; planType?: UserPlanType },
  ) {
    const existingUser = await this.findUserWithRelations(id);

    if (!existingUser) throw new NotFoundException('El usuario no existe');

    if (rest.planType === UserPlanType.SUPERADMIN) {
      // Preferimos la capability (platform.staff.manage, exclusiva de SUPER_ADMIN);
      // los llamadores legacy de staff que solo pasan planType conservan su chequeo.
      const allowed = actingUser?.id
        ? (
            await this.authorizationService.check(
              { userId: actingUser.id },
              { caps: ['platform.staff.manage'], operator: 'AND' },
            )
          ).allowed
        : actingUser?.planType === UserPlanType.SUPERADMIN;

      if (!allowed) {
        throw new ForbiddenException('Solo un usuario con gestión de staff puede otorgar el rol superadmin');
      }
    }

    const oldAvatarKey = existingUser.avatarKey;
    Object.assign(existingUser, rest);

    if (username) {
      const normalizedUsername = this.usernameService.normalize(username);
      const isSameUsername =
        normalizedUsername.toLowerCase() === existingUser.username.toLowerCase();

      if (!isSameUsername) {
        const isAvailable = await this.usernameService.isAvailable(normalizedUsername, id);
        if (!isAvailable) {
          throw new ConflictException('Ese nombre de usuario ya está en uso');
        }
      }

      existingUser.username = normalizedUsername;
      // Cualquier elección explícita del usuario cuenta como definitiva,
      // aunque vuelva a escribir el mismo username temporal del backfill.
      existingUser.usernameIsTemporary = false;
    }

    const genres = await this.getValidatedGenres(preferredGenres);
    if (genres) existingUser.preferredGenres = genres;

    if (avatarUrl && avatarKey) {
      existingUser.avatarKey = avatarKey;
      existingUser.avatarUrl = avatarUrl;
    }

    let updatedUser: User;
    try {
      updatedUser = await this.saveAndReturnWithRelations(existingUser);
    } catch (error) {
      this.rethrowIfUsernameTaken(error);
    }

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

  /** Búsqueda exacta por username (case-insensitive), usada para agregar coautores a un split y autorizar destinatarios de contenido compartido. */
  async findByUsernameService(username: string): Promise<User> {
    const normalizedUsername = this.usernameService.normalize(username);
    const user = await this.usersRepository
      .createQueryBuilder('u')
      .where('LOWER(u.username) = LOWER(:username)', { username: normalizedUsername })
      .getOne();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  /** Disponibilidad de un username, usada por el formulario de registro/perfil para feedback en tiempo real. */
  async isUsernameAvailableService(username: string, excludeUserId?: string): Promise<{ available: boolean }> {
    const available = await this.usernameService.isAvailable(username, excludeUserId);
    return { available };
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
