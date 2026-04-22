import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { In, Repository } from 'typeorm';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UserRole } from './entities/user-role.enum';
import { User } from './entities/user.entity';
import { StorageService } from '../shared/storage/storage.service';

import { PaginationDto } from '../shared/dto/pagination.dto';

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
    private readonly storageService: StorageService,
  ) { }

  // =============================
  // Métodos Privados (DRY)
  // =============================

  private async findUserWithRelations(
    id: string,
    role?: UserRole,
  ): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id, ...(role && { role }) },
      relations: userRelations,
    });
    if (!user) throw new NotFoundException('El usuario no existe');

    // Limpiar el subGenre del genre dentro de cada track
    // para evitar confusión con el subGenre propio del track
    if (user.tracks) {
      user.tracks = user.tracks.map((track) => {
        if (track.genre) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { subGenre: _, ...genreRest } = track.genre;
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

    const newUser = this.usersRepository.create({
      ...rest,
      ...(genres && { preferredGenres: genres }),
    });

    return this.saveAndReturnWithRelations(newUser);
  }

  async updateUserService(
    id: string,
    { preferredGenres, avatarKey, avatarUrl, ...rest }: UpdateUserInput,
  ) {
    const existingUser = await this.findUserWithRelations(id);

    if (!existingUser) throw new NotFoundException('El usuario no existe');

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

  async findOneUserByIdService(id: string): Promise<User> {
    return this.findUserWithRelations(id);
  }

  async findAllUsersService(paginationDto: PaginationDto) {
    const { limit, offset } = paginationDto;
    const [data, total] = await this.usersRepository.findAndCount({
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });
    return { data, total };
  }

  async findOneUserService(id: string) {
    return this.findUserWithRelations(id);
  }

  async findUserBycitizenIDService(citizenID: string) {
    return await this.usersRepository.findOne({
      where: { citizenID },
      select: ['id', 'email', 'password', 'role', 'name', 'citizenID'],
    });
  }

  async findUserByEmailService(email: string) {
    return await this.usersRepository.findOne({
      where: { email },
      select: ['id', 'email', 'role', 'name', 'password'],
    });
  }

  getUserRolesService() {
    return Object.values(UserRole);
  }

  async findAllAuthorsService(roles: UserRole[], paginationDto: PaginationDto) {
    const { limit, offset } = paginationDto;
    const [data, total] = await this.usersRepository.findAndCount({
      where: { role: In(roles) },
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });
    return { data, total };
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
}
