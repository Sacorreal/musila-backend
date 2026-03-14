import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Track } from 'src/tracks/entities/track.entity';

import { Repository, FindOptionsWhere } from 'typeorm';
import { CreateRequestedTrackInput } from './dto/create-requested-track.input';
import { UpdateRequestedTrackInput } from './dto/update-requested-track.input';
import { RequestedTrack } from './entities/requested-track.entity';
import  type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

import {UserRole } from '../users/entities/user-role.enum'; 
import { PaginationDto} from '../common/dto/pagination.dto'

const requestedTracksRelations: string[] = [
  'requester',
  'track',
]

@Injectable()
export class RequestedTracksService {
  constructor(
    @InjectRepository(RequestedTrack) private readonly requestedTracksRepository: Repository<RequestedTrack>,
    @InjectRepository(Track) private readonly tracksRepository: Repository<Track>,
   
   

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

  async createRequestedTracksService(
    { trackId, licenseType }: CreateRequestedTrackInput, 
    userRequester: JwtPayload 
  ) {
    // Cargamos solo el ID de los autores para no saturar memoria
    const track = await this.tracksRepository.findOne({
      where: { id: trackId },
      select: ['id'], 
      relations: ['authors']
    });

    if (!track) throw new NotFoundException('La pista no existe');

    // Validamos que el solicitante no sea autor de la canción
    const isAuthor = track.authors.some(author => author.id === userRequester.id);
    if (isAuthor) throw new BadRequestException('No puedes solicitar una licencia de tu propia canción');

    const newRequestedTrack = this.requestedTracksRepository.create({
      requester: { id: userRequester.id },
      track: { id: trackId },
      licenseType,
    });

    return await this.saveAndReturnWithRelations(newRequestedTrack);
  }

  async findAllRequestedTracksService(
    user: JwtPayload,
    paginationDto: PaginationDto,
  ) {
    const { limit, offset } = paginationDto;    

    const isAdmin = user?.role === UserRole.ADMIN;

    // Si no es Admin, filtramos para que solo vea las solicitudes hacia sus propias canciones
    const where: FindOptionsWhere<RequestedTrack> = {
      ...(!isAdmin && user && { track: { authors: { id: user.id } } })
    };

    const [data, total] = await this.requestedTracksRepository.findAndCount({
      where,
      take: limit,
      skip: offset,
      relations: ['track']
    });

    return {
      data,
      total
    };
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
