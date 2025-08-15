import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
// import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  // Método cosnultar si es necesario ya que no se usa
  // @Mutation(() => User)
  // createUser(@Args('createUserInput') createUserInput: CreateUserInput) {
  //   return this.usersService.createUserService(createUserInput);
  // }

  @Query(() => [User], { name: 'users' })
  findAll() {
    return this.usersService.findAllUsersService();
  }

  @Query(() => User, { name: 'user' })
  findOne(@Args('id', { type: () => ID }) id: string) {
    return this.usersService.findOneUserService(id);
  }

  @Mutation(() => User)
  updateUser(@Args('updateUserInput') updateUserInput: UpdateUserInput) {
    return this.usersService.updateUserService(updateUserInput.id, updateUserInput);
  }

  @Mutation(() => User)
  removeUser(@Args('id', { type: () => ID }) id: string) {
    return this.usersService.removeUserService(id);
  }
}
