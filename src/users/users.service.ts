import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UserRole } from './entities/user-role.enum';
import { User } from './entities/user.entity';
import { StorageService } from 'src/storage/storage.service';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { In } from 'typeorm';

const userRelations: string[] = [
  'tracks',
  'guests',
  'playlists',
  'requestSent',
  'preferredGenres',
]

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly storageService: StorageService,
    @InjectRepository(MusicalGenre) private readonly musicalGenreRepository: Repository<MusicalGenre>
  ) { }


  private async findUserWithRelations(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: userRelations
    })

    if (!user) throw new NotFoundException('El usuario no existe');

    return user;
  }

  private async saveAndReturnWithRelations(user: User): Promise<User> {
    const savedUser = await this.usersRepository.save(user);
    return this.findUserWithRelations(savedUser.id)
  }

  private async handleAvatar(file?: Express.Multer.File, currentAvatar?: string): Promise<string> {
    if (!file) {
      return currentAvatar ?? 'https://mi-bucket.s3.region.amazonaws.com/defaults/avatar.png'
    }

    const putObjectDto = { key: `avatars/${Date.now()}-${file.originalname}` }
    const uploadResult = await this.storageService.uploadObject(putObjectDto, file)

    return uploadResult.url

  }


  async createUserService(
    createUserInput: CreateUserInput,
    file?: Express.Multer.File
  ) {

    const { preferredGenres, ...rest } = createUserInput

    const newUser = this.usersRepository.create(rest)

    if (preferredGenres && preferredGenres.length > 0) {
      const genres = await this.musicalGenreRepository.findBy({
        id: In(preferredGenres)
      })

      newUser.preferredGenres = genres
    }

    newUser.avatar = await this.handleAvatar(file)

    return this.saveAndReturnWithRelations(newUser)
  }

  async findAllUsersService() {
    return await this.usersRepository.find();
  }

  async findOneUserService(id: string) {
    return this.findUserWithRelations(id)
  }

  async updateUserService(id: string, updateUserInput: UpdateUserInput, file?: Express.Multer.File) {

    const existingUser = await this.findUserWithRelations(id);

    const { preferredGenres, ...rest } = updateUserInput

    Object.assign(existingUser, rest);

    if (preferredGenres) {
      const genres = await this.musicalGenreRepository.findBy({
        id: In(preferredGenres)
      })

      existingUser.preferredGenres = genres
    }

    existingUser.avatar = await this.handleAvatar(file, existingUser.avatar)

    return this.saveAndReturnWithRelations(existingUser)
  }

  async removeUserService(id: string) {
    const userToRemove = await this.findUserWithRelations(id);

    await this.usersRepository.remove(userToRemove);

    return userToRemove;
  }

  async findUserByEmailService(email: string) {
    return await this.usersRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'role'],
    });
  }

  getUserRolesService() {
    return Object.values(UserRole);
  }

  async getFeaturedAuthorsByPreferredGenresService(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['preferredGenres']
    })

    if (!user?.preferredGenres?.length) return []

    const genreIds = user.preferredGenres.map(genre => genre.id)

    return await this.usersRepository.find({
      where: {
        id: Not(userId),
        role: UserRole.AUTOR,
        tracks: { genre: { id: In(genreIds) } }
      },
      relations: ['tracks', 'tracks.genre'],
      take: 10
    })

  }
}
