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
    const { genreId, authorsIds, ...rest } = createTrackInput

    const genre = await this.genreRepository.findOne({ where: { id: genreId } })

    if (!genre) throw new NotFoundException('El género musical no existe');

    const authors = await this.usersRepository.find({ where: { id: In(authorsIds) } })

    if (authors.length !== authorsIds.length) throw new NotFoundException('Uno o más autores no existen');

    if (!file) throw new BadRequestException('El archivo de la canción es obligatorio');
    const putObjectDto: PutObjectDto = { key: crypto.randomUUID() }
    const uploadResult = await this.storageService.uploadObject(putObjectDto, file)

    const newTrack = this.tracksRepository.create({
      ...rest,
      genre,
      authors,
      url: uploadResult.url
    })

    return await this.saveAndReturnWithRelations(newTrack)
  }

  async findAllTracksService() {
    return await this.tracksRepository.find({ relations: tracksRelations })
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
}
