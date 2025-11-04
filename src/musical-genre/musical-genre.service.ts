import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMusicalGenreInput } from './dto/create-musical-genre.input';
import { UpdateMusicalGenreInput } from './dto/update-musical-genre.input';
import { InjectRepository } from '@nestjs/typeorm';
import { MusicalGenre } from './entities/musical-genre.entity';
import { ILike, Repository } from 'typeorm';
import { Track } from 'src/tracks/entities/track.entity';

const musicalGenreRelations: string[] = ['tracks']

@Injectable()
export class MusicalGenreService {
  constructor(
    @InjectRepository(MusicalGenre) private readonly musicalGenreRepository: Repository<MusicalGenre>,
    @InjectRepository(Track) private readonly trackRepository: Repository<Track>,
  ) { }


  private async findMusicalGenreWithRelations(identifier: string): Promise<MusicalGenre> {

    const isUUID = /^[0-9a-fA-F-]{36}$/.test(identifier)

    let genre: MusicalGenre | null = null

    if (isUUID) {
      genre = await this.musicalGenreRepository.findOne({
        where: { id: identifier },
        relations: musicalGenreRelations
      })
    } else {
      genre = await this.musicalGenreRepository.findOne({
        where: { genre: ILike(identifier) },
        relations: musicalGenreRelations
      })
    }

    if (!genre) throw new NotFoundException('El genero no existe')
    return genre
  }

  private async saveAndReturnGenreWithRelations(genre: MusicalGenre): Promise<MusicalGenre> {
    const savedGenre = await this.musicalGenreRepository.save(genre)
    return await this.findMusicalGenreWithRelations(savedGenre.id)
  }

  async createMusicalGenreService(createMusicalGenreInput: CreateMusicalGenreInput) {
    const newMusicalGenre = this.musicalGenreRepository.create(createMusicalGenreInput)
    return await this.saveAndReturnGenreWithRelations(newMusicalGenre)
  }

  async findAllMusicalGenreService() {
    return await this.musicalGenreRepository.find({ relations: musicalGenreRelations })
  }

  async findOneMusicalGenreService(id: string) {
    return await this.findMusicalGenreWithRelations(id)
  }

  async updateMusicalGenreService(id: string, updateMusicalGenreInput: UpdateMusicalGenreInput) {
    const existingGenre = await this.findMusicalGenreWithRelations(id)

    Object.assign(existingGenre, updateMusicalGenreInput)

    return await this.saveAndReturnGenreWithRelations(existingGenre)

  }

  async removeMusicalGenreService(id: string) {
    const genreToRemove = await this.findMusicalGenreWithRelations(id)

    await this.musicalGenreRepository.remove(genreToRemove)

    return genreToRemove

  }
}
