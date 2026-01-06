import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthRolesGuard } from 'src/auth/guards/jwt-auth-roles.guard';
import { AuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UpdateUserInput } from './dto/update-user.input';
import { UserRole } from './entities/user-role.enum';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(JwtAuthRolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  async findAllUserController() {
    return await this.usersService.findAllUsersService();
  }

  // Rutas específicas deben ir ANTES de las rutas con parámetros genéricos
  @Get('roles')
  getUserRolesController() {
    return this.usersService.getUserRolesService();
  }

  @Get('authors')
  getAuthorsController() {
    return this.usersService.findAllAuthorsService(UserRole.AUTOR);
  }

  @Get('author/:id')
  async findOneAuthorController(@Param('id') id: string) {
    return await this.usersService.findOneAuthorService(id);
  }

  // Rutas con parámetros genéricos deben ir AL FINAL
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Get(':id/featured-authors')
  async findFeaturedAuthorsController(@CurrentUser() payload: JwtPayload) {
    return await this.usersService.getFeaturedAuthorsByPreferredGenresService(
      payload.id,
    );
  }

  @Get(':id')
  async findOneUserController(@Param('id') id: string) {
    return await this.usersService.findOneUserService(id);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('file'))
  async updateUserController(
    @Body() updateUserInput: UpdateUserInput,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return await this.usersService.updateUserService(id, updateUserInput, file);
  }

  @Delete(':id')
  async removeUserController(@Param('id') id: string) {
    return await this.usersService.removeUserService(id);
  }
}
