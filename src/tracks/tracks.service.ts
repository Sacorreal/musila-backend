import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTrackInput } from './dto/create-track.input';
import { UpdateTrackInput } from './dto/update-track.input';
import { InjectRepository } from '@nestjs/typeorm';
import { Track } from './entities/track.entity';
import { Repository } from 'typeorm';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';

@Injectable()
export class TracksService {
  constructor(
    @InjectRepository(Track) private readonly tracksRepository: Repository<Track>,
    @InjectRepository(MusicalGenre) private readonly genreRepository: Repository<MusicalGenre>,
  ) { }

  async createTrackService(createTrackInput: CreateTrackInput) {
    const { genreId, ...rest } = createTrackInput
    const genre = await this.genreRepository.findOne({ where: { id: genreId } })

    if (!genre) throw new NotFoundException('El género musical no existe');

    const newTrack = this.tracksRepository.create({
      ...rest,
      genre
    })

    return await this.tracksRepository.save(newTrack)

  }

  async findAllTracksService() {
    return await this.tracksRepository.find()
  }

  async findOneTrackService(id: string) {
    return await this.tracksRepository.findOne({ where: { id } })
  }

  async updateTrackService(id: string, updateTrackInput: UpdateTrackInput) {
    const existingTrack = await this.tracksRepository.findOne({ where: { id } });

    if (!existingTrack) throw new NotFoundException('El track no existe');

    Object.assign(existingTrack, updateTrackInput);

    return await this.tracksRepository.save(existingTrack);
  }

  async removeTrackService(id: string) {
    const trackToRemove = await this.tracksRepository.findOne({ where: { id } });

    if (!trackToRemove) throw new NotFoundException('El track no existe');

    await this.tracksRepository.remove(trackToRemove);

    return true
  }
}
