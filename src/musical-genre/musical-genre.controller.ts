import { MusicalGenreService } from './musical-genre.service';
import { CreateMusicalGenreInput } from './dto/create-musical-genre.input';
import { UpdateMusicalGenreInput } from './dto/update-musical-genre.input';
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Musical Genre')
@Controller('musical-genre')
export class MusicalGenreController {
  constructor(private readonly musicalGenreService: MusicalGenreService) { }

  @Post()
  async createMusicalGenreController(@Body() createMusicalGenreInput: CreateMusicalGenreInput) {
    return await this.musicalGenreService.createMusicalGenreService(createMusicalGenreInput);
  }


  @Get()
  async findAllMusicalGenreController() {
    return await this.musicalGenreService.findAllMusicalGenreService();
  }

  @Get(':id')
  async findOneMusicalGenreController(@Param('id') id: string) {
    return await this.musicalGenreService.findOneMusicalGenreService(id);
  }

  @Put('id')
  async updateMusicalGenreController(@Body() updateMusicalGenreInput: UpdateMusicalGenreInput, @Param('id') id: string) {
    return await this.musicalGenreService.updateMusicalGenreService(id, updateMusicalGenreInput);
  }

  @Delete(':id')
  async removeMusicalGenreController(@Param('id') id: string) {
    return await this.musicalGenreService.removeMusicalGenreService(id);
  }
}
