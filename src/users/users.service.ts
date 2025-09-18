import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UserRole } from './entities/user-role.enum';
import { User } from './entities/user.entity';

const userRelations: string[] = [
  'tracks',
  'guests',
  'playlists',
  'requestSent'
]

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
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

  async createUserService(createUserInput: CreateUserInput) {
    const newUser = this.usersRepository.create(createUserInput)
    return this.saveAndReturnWithRelations(newUser)
  }

  async findAllUsersService() {
    return await this.usersRepository.find({ relations: userRelations });
  }

  async findOneUserService(id: string) {
    return this.findUserWithRelations(id)
  }

  async updateUserService(id: string, updateUserInput: UpdateUserInput) {
    const existingUser = await this.findUserWithRelations(id);

    Object.assign(existingUser, updateUserInput);

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
}
