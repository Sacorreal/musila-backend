import { Injectable } from '@nestjs/common';
import { CreateMusicalGenreInput } from './dto/create-musical-genre.input';
import { UpdateMusicalGenreInput } from './dto/update-musical-genre.input';

@Injectable()
export class MusicalGenreService {
  create(createMusicalGenreInput: CreateMusicalGenreInput) {
    return 'This action adds a new musicalGenre';
  }

  findAll() {
    return `This action returns all musicalGenre`;
  }

  findOne(id: number) {
    return `This action returns a #${id} musicalGenre`;
  }

  update(id: number, updateMusicalGenreInput: UpdateMusicalGenreInput) {
    return `This action updates a #${id} musicalGenre`;
  }

  remove(id: number) {
    return `This action removes a #${id} musicalGenre`;
  }
}
