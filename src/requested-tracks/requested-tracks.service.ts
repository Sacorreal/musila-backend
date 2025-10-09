import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRequestedTrackInput } from './dto/create-requested-track.input';
import { UpdateRequestedTrackInput } from './dto/update-requested-track.input';
import { InjectRepository } from '@nestjs/typeorm';
import { RequestedTrack } from './entities/requested-track.entity';
import { Repository } from 'typeorm';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import { StorageService } from 'src/storage/storage.service';

const requestedTracksRelations: string[] = [
  'requester',
  'track',
]

@Injectable()
export class RequestedTracksService {
  constructor(
    @InjectRepository(RequestedTrack) private readonly requestedTracksRepository: Repository<RequestedTrack>,
    @InjectRepository(Track) private readonly tracksRepository: Repository<Track>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly storageService: StorageService

  ) { }

  private async findRequestedTrackWithRelations(id: string): Promise<RequestedTrack> {
    const requestedTrack = await this.requestedTracksRepository.findOne({
      where: { id },
      relations: requestedTracksRelations
    })

    if (!requestedTrack) throw new NotFoundException('La pista solicitada no existe')

    return requestedTrack
  }

  private async saveAndReturnWithRelations(requestedTrack: RequestedTrack): Promise<RequestedTrack> {
    const savedRequestedTrack = await this.requestedTracksRepository.save(requestedTrack)
    return await this.findRequestedTrackWithRelations(savedRequestedTrack.id)
  }

  async createRequestedTracksService(createRequestedTrackInput: CreateRequestedTrackInput, file?: Express.Multer.File) {
    const { requesterId, trackId, licenseType } = createRequestedTrackInput

    const requester = await this.usersRepository.findOne({ where: { id: requesterId } })
    if (!requester) throw new NotFoundException('El usuario solicitante no existe')

    const track = await this.tracksRepository.findOne({ where: { id: trackId } })
    if (!track) throw new NotFoundException('La pista no existe')

    let documentUrl: string | null = null

    if (file) {
      const uploadResult = await this.storageService.uploadObject(
        { key: `${requesterId}-${Date.now()}-${file.originalname}` },
        file
      )
      documentUrl = uploadResult.url
    }


    const newRequestedTrack = this.requestedTracksRepository.create({
      requester,
      track,
      licenseType,
      documentUrl
    })

    return await this.saveAndReturnWithRelations(newRequestedTrack)
  }

  async findAllRequestedTracksService() {
    return await this.requestedTracksRepository.find({ relations: requestedTracksRelations })
  }

  async findOneRequestedTracksService(id: string) {
    return await this.findRequestedTrackWithRelations(id)
  }

  async updateRequestedTracksService(id: string, updateRequestedTrackInput: UpdateRequestedTrackInput) {
    const existingRequestedTrack = await this.findRequestedTrackWithRelations(id)

    Object.assign(existingRequestedTrack, updateRequestedTrackInput)

    return await this.saveAndReturnWithRelations(existingRequestedTrack)
  }

  async removeRequestedTracksService(id: string) {
    const requestedTrackToRemove = await this.findRequestedTrackWithRelations(id)

    await this.requestedTracksRepository.remove(requestedTrackToRemove)

    return requestedTrackToRemove
  }
}
