import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateTrackInput } from './dto/create-track.input';
import { UpdateTrackInput } from './dto/update-track.input';
import { InjectRepository } from '@nestjs/typeorm';
import { Track } from './entities/track.entity';
import { ILike, In, Repository } from 'typeorm';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { User } from 'src/users/entities/user.entity';
import { StorageService } from 'src/storage/storage.service';
import { PutObjectDto } from 'src/storage/dto/put-object.dto';

const tracksRelations: string[] = [
  'genre',
  'intellectualProperties',
  'authors',
  'playlists',
  'requestedTrack'
]

@Injectable()
export class TracksService {
  constructor(
    @InjectRepository(Track) private readonly tracksRepository: Repository<Track>,
    @InjectRepository(MusicalGenre) private readonly genreRepository: Repository<MusicalGenre>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly storageService: StorageService
  ) { }

  private async findTrackWithRelations(id: string): Promise<Track> {
    const track = await this.tracksRepository.findOne({
      where: { id },
      relations: tracksRelations
    })

    if (!track) throw new NotFoundException('El track no existe');

    return track;
  }

  private async saveAndReturnWithRelations(track: Track): Promise<Track> {
    const savedTrack = await this.tracksRepository.save(track);
    return this.findTrackWithRelations(savedTrack.id)
  }

  async createTrackService(createTrackInput: CreateTrackInput, file: Express.Multer.File) {
    const { genreId, subGenre, authorsIds, ...rest } = createTrackInput

    const genre = await this.genreRepository.findOne({ where: { id: genreId } })

    if (!genre) throw new NotFoundException('El género musical no existe');

    if (genre.subGenre && genre.subGenre.length > 0) {
      const isValidSubGenre = genre.subGenre.some(sg => sg.toLowerCase() === subGenre.toLowerCase())

      if (!isValidSubGenre) {
        throw new BadRequestException(`El subgénero "${subGenre}" no pertenece al género "${genre.genre}".` +
          ` Los subgéneros válidos son: ${genre.subGenre.join(', ')}.`
        );
      }
    } else {
      throw new BadRequestException(`El género "${genre.genre}" no tiene subgéneros definidos.`)
    }

    const authors = await this.usersRepository.find({ where: { id: In(authorsIds) } })

    if (authors.length !== authorsIds.length) throw new NotFoundException('Uno o más autores no existen');

    if (!file) throw new BadRequestException('El archivo de la canción es obligatorio');
    const putObjectDto: PutObjectDto = { key: crypto.randomUUID() }
    const uploadResult = await this.storageService.uploadObject(putObjectDto, file)

    const newTrack = this.tracksRepository.create({
      ...rest,
      genre,
      subGenre,
      authors,
      url: uploadResult.url
    })

    return await this.saveAndReturnWithRelations(newTrack)
  }

  async findAllTracksService() {
    const tracks = await this.tracksRepository.find({ relations: ['genre'] })

    return tracks.map(track => ({
      ...track,
      genre: track.genre ? { id: track.genre.id, genre: track.genre.genre } : null
    }))
  }

  async findOneTrackService(id: string) {
    return await this.findTrackWithRelations(id)
  }

  async updateTrackService(id: string, updateTrackInput: UpdateTrackInput) {
    const existingTrack = await this.findTrackWithRelations(id);

    Object.assign(existingTrack, updateTrackInput);

    return await this.saveAndReturnWithRelations(existingTrack)

  }

  async removeTrackService(id: string) {
    const trackToRemove = await this.findTrackWithRelations(id);

    await this.tracksRepository.remove(trackToRemove);

    return trackToRemove
  }

  async searchTracksService(q: string) {
    return await this.tracksRepository.find({
      where: {
        isAvailable: true,
        title: ILike(`%${q}%`)
      }
    })
  }


  async findTracksByUserPreferredGenresService(user: User): Promise<Track[]> {
    if (!user.preferredGenres || user.preferredGenres.length === 0) {
      throw new NotFoundException('El usuario no tiene géneros preferidos configurados.')
    }

    const preferredGenreIds = user.preferredGenres.map(genre => genre.id)

    return await this.tracksRepository.find({
      where: {
        genre: { id: In(preferredGenreIds) },
        isAvailable: true,
      }
    })
  }
}
