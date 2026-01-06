import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthRolesGuard } from 'src/auth/guards/jwt-auth-roles.guard';
import { UserRole } from 'src/users/entities/user-role.enum';
import { CreateMusicalGenreInput } from './dto/create-musical-genre.input';
import { UpdateMusicalGenreInput } from './dto/update-musical-genre.input';
import { MusicalGenreService } from './musical-genre.service';

@ApiTags('Musical Genre')
@Controller('musical-genre')
export class MusicalGenreController {
  constructor(private readonly musicalGenreService: MusicalGenreService) {}

  @UseGuards(JwtAuthRolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post()
  async createMusicalGenreController(
    @Body() createMusicalGenreInput: CreateMusicalGenreInput,
  ) {
    return await this.musicalGenreService.createMusicalGenreService(
      createMusicalGenreInput,
    );
  }

  @Get()
  async findAllMusicalGenreController() {
    return await this.musicalGenreService.findAllMusicalGenreService();
  }

  @Get(':id')
  async findOneMusicalGenreController(@Param('id') id: string) {
    return await this.musicalGenreService.findOneMusicalGenreService(id);
  }

  @UseGuards(JwtAuthRolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Put(':id')
  async updateMusicalGenreController(
    @Body() updateMusicalGenreInput: UpdateMusicalGenreInput,
    @Param('id') id: string,
  ) {
    return await this.musicalGenreService.updateMusicalGenreService(
      id,
      updateMusicalGenreInput,
    );
  }

  @UseGuards(JwtAuthRolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Delete(':id')
  async removeMusicalGenreController(@Param('id') id: string) {
    return await this.musicalGenreService.removeMusicalGenreService(id);
  }
}
