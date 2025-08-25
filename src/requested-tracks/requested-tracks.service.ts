import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRequestedTrackInput } from './dto/create-requested-track.input';
import { UpdateRequestedTrackInput } from './dto/update-requested-track.input';
import { InjectRepository } from '@nestjs/typeorm';
import { RequestedTrack } from './entities/requested-track.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RequestedTracksService {
  constructor(@InjectRepository(RequestedTrack) private readonly requestedTracksRepository: Repository<RequestedTrack>) { }

  async createRequestedTracksService(createRequestedTrackInput: CreateRequestedTrackInput) {
    return await this.requestedTracksRepository.save(
      this.requestedTracksRepository.create(createRequestedTrackInput)
    )
  }

  async findAllRequestedTracksService() {
    return await this.requestedTracksRepository.find()
  }

  async findOneRequestedTracksService(id: string) {
    return await this.requestedTracksRepository.findOne({ where: { id } })
  }

  async updateRequestedTracksService(id: string, updateRequestedTrackInput: UpdateRequestedTrackInput) {
    const existingRequestedTrack = await this.requestedTracksRepository.findOne({ where: { id } })

    if (!existingRequestedTrack) throw new NotFoundException('La pista no existe');

    Object.assign(existingRequestedTrack, updateRequestedTrackInput)

    await this.requestedTracksRepository.save(existingRequestedTrack)

    return existingRequestedTrack
  }

  async removeRequestedTracksService(id: string) {
    const requestedTrackToRemove = await this.requestedTracksRepository.findOne({ where: { id } })

    if (!requestedTrackToRemove) throw new NotFoundException('La pista no existe');

    return await this.requestedTracksRepository.remove(requestedTrackToRemove)
  }
}
