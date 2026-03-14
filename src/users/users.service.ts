import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { In, Not, Repository } from 'typeorm';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UserRole } from './entities/user-role.enum';
import { User } from './entities/user.entity';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { PaginationDto} from '../common/dto/pagination.dto'


const userRelations: string[] = ['tracks', 'guests', 'playlists', 'requestSent', 'preferredGenres'];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(MusicalGenre) private readonly musicalGenreRepository: Repository<MusicalGenre>,
  ) {}

  // =============================
  // Métodos Privados (DRY)
  // =============================

  private async findUserWithRelations(id: string, role?: UserRole): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id, ...(role && { role }) },
      relations: userRelations,
    });
    if (!user) throw new NotFoundException('El usuario no existe');
    return user;
  }

  private async saveAndReturnWithRelations(user: User): Promise<User> {
    const savedUser = await this.usersRepository.save(user);
    return this.findUserWithRelations(savedUser.id);
  }

 //Centraliza la lógica repetida de creación y actualización
  private async getValidatedGenres(genreIds?: string[]): Promise<MusicalGenre[] | undefined> {
    if (!genreIds?.length) return undefined;
    if (genreIds.length > 3) {
      throw new BadRequestException('El usuario no puede tener más de 3 géneros preferidos');
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

  async updateUserService(id: string, { preferredGenres, ...rest }: UpdateUserInput) {
    const existingUser = await this.findUserWithRelations(id);
    Object.assign(existingUser, rest);

    const genres = await this.getValidatedGenres(preferredGenres);
    if (genres) existingUser.preferredGenres = genres;

    return this.saveAndReturnWithRelations(existingUser);
  }

  async removeUserService(id: string) {
    const result = await this.usersRepository.softDelete(id);
    if (result.affected === 0) throw new NotFoundException('El usuario no existe');
    return { id, message: 'Usuario eliminado' };
  }

  async findOneUserByIdService(id: string) {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('El usuario no existe');
    return user;
  }

  async findAllUsersService( paginationDto: PaginationDto,
  ) {    
    const { limit, offset } = paginationDto;  
    return await this.usersRepository.find({
      take: limit,
      skip: offset,
    });
  }

  async findOneUserService(id: string) {
    return this.findUserWithRelations(id);
  }

  async findOneAuthorService(id: string) {
    return this.findUserWithRelations(id, UserRole.AUTOR);
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
      select: ['id', 'email', 'role', 'name'],
    });
  }

  getUserRolesService() {
    return Object.values(UserRole);
  }

  

  async findAllAuthorsService(userRole: UserRole) {
    return await this.usersRepository.find({
      where: { role: userRole },
      take: 10,
      order: { createdAt: 'DESC' },
    });
  }
}