import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MailService } from 'src/mail/mail.service';
import { StorageService } from 'src/storage/storage.service';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateRequestedTrackInput } from './dto/create-requested-track.input';
import { UpdateRequestedTrackInput } from './dto/update-requested-track.input';
import { RequestedTrack } from './entities/requested-track.entity';

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
    private readonly storageService: StorageService,
    private readonly mailService: MailService

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

    const track = await this.tracksRepository.findOne({
      where: { id: trackId },
      relations: ['authors']
    })
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
      documentUrl,
    })

    const savedNewRequestedTrack = await this.saveAndReturnWithRelations(newRequestedTrack)

    const authors = track.authors
    const authorsNames = authors.map(author => author.name).join(', ')
    const isMultipleAuthors = authors.length > 1;

    {/* TODO: configurar servidor para envío de email      
     
    for (const author of authors) {
      await this.mailService.sendAuthorRequestNotificationService(
        author.email,
        author.name,
        track.title,
        requester.name,
        licenseType,

      )
    }

    await this.mailService.sendRequestTrackService(
      requester.email,
      requester.name,
      track.title,
      authorsNames,
      savedNewRequestedTrack.status,
      isMultipleAuthors
    )
    */}

    return savedNewRequestedTrack
  }

  async findAllRequestedTracksService() {
    return await this.requestedTracksRepository.find()
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

    await this.requestedTracksRepository.softRemove(requestedTrackToRemove)

    return requestedTrackToRemove
  }
}
