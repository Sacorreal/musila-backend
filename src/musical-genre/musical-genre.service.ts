import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMusicalGenreInput } from './dto/create-musical-genre.input';
import { UpdateMusicalGenreInput } from './dto/update-musical-genre.input';
import { InjectRepository } from '@nestjs/typeorm';
import { MusicalGenre } from './entities/musical-genre.entity';
import { Repository } from 'typeorm';

@Injectable()
export class MusicalGenreService {
  constructor(@InjectRepository(MusicalGenre) private readonly musicalGenreRepository: Repository<MusicalGenre>) { }
  async createMusicalGenreService(createMusicalGenreInput: CreateMusicalGenreInput) {
    return await this.musicalGenreRepository.save(
      this.musicalGenreRepository.create(createMusicalGenreInput)
    )
  }

  async findAllMusicalGenreService() {
    return await this.musicalGenreRepository.find()
  }

  async findOneMusicalGenreService(id: string) {
    return await this.musicalGenreRepository.findOne({ where: { id } })
  }

  async updateMusicalGenreService(id: string, updateMusicalGenreInput: UpdateMusicalGenreInput) {
    const existingGenre = await this.musicalGenreRepository.findOne({ where: { id } })
    if (!existingGenre) throw new NotFoundException('El genero no existe')

    Object.assign(existingGenre, updateMusicalGenreInput)

    return await this.musicalGenreRepository.save(existingGenre)

  }

  async removeMusicalGenreService(id: string) {
    const genreToRemove = await this.musicalGenreRepository.findOne({ where: { id } })
    if (!genreToRemove) throw new NotFoundException('El genero no existe')

    await this.musicalGenreRepository.remove(genreToRemove)

    return true
      
  }
}
