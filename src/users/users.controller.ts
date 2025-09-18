import { UsersService } from './users.service';
import { UpdateUserInput } from './dto/update-user.input';
import { Body, Controller, Delete, Get, Param, Put } from '@nestjs/common';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  async findAllUserController() {
    return await this.usersService.findAllUsersService();
  }

  @Get(':id')
  async findOneUserController(@Param('id') id: string) {
    return await this.usersService.findOneUserService(id);
  }

  @Put(':id')
  async updateUserController(@Body() updateUserInput: UpdateUserInput, @Param('id') id: string) {
    return await this.usersService.updateUserService(id, updateUserInput);
  }

  @Delete(':id')
  async removeUserController(@Param() id: string) {
    return await this.usersService.removeUserService(id);
  }

  @Get('roles')
  getUserRolesController() {
    return this.usersService.getUserRolesService()
  }
}
