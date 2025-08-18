import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly usersRepository: Repository<User>) { }

  async createUserService(createUserInput: CreateUserInput) {
    return await this.usersRepository.save(
      this.usersRepository.create(createUserInput)
    )
  }

  async findAllUsersService() {
    return await this.usersRepository.find();
  }

  async findOneUserService(id: string) {
    return await this.usersRepository.findOne({ where: { id } });
  }

  async updateUserService(id: string, updateUserInput: UpdateUserInput) {

    const existingUser = await this.usersRepository.findOne({ where: { id } });

    if (!existingUser) throw new NotFoundException('El usuario no existe');

    Object.assign(existingUser, updateUserInput);

    return await this.usersRepository.save(existingUser);
  }

  async removeUserService(id: string) {
    const userToRemove = await this.usersRepository.findOne({ where: { id } });

    if (!userToRemove) throw new NotFoundException('El usuario no existe');

    await this.usersRepository.remove(userToRemove);

    return userToRemove;
  }

  async findUserByEmailService(email: string) {
    return await this.usersRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password'],
    })
  }
}
