import { UsersService } from './users.service';
import { UpdateUserInput } from './dto/update-user.input';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { AuthGuard } from 'src/auth/guards/jwt-auth.guard';


@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  async findAllUserController() {
    return await this.usersService.findAllUsersService();
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Get(':id/featured-authors')
  async findFeaturedAuthorsController(@CurrentUser() payload: JwtPayload) {
    return await this.usersService.getFeaturedAuthorsByPreferredGenresService(payload.id)
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
