import { UsersService } from './users.service';
import { UpdateUserInput } from './dto/update-user.input';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('Users')
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
  @UseInterceptors(FileInterceptor('file'))
  async updateUserController(@Body() updateUserInput: UpdateUserInput, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @UploadedFile() file?: Express.Multer.File) {
    return await this.usersService.updateUserService(id, updateUserInput, file);
  }

  @Delete(':id')
  async removeUserController(@Param('id') id: string) {
    return await this.usersService.removeUserService(id);
  }

  @Get('roles')
  getUserRolesController() {
    return this.usersService.getUserRolesService()
  }
}
