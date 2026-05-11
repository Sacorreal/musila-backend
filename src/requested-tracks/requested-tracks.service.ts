import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Track } from 'src/tracks/entities/track.entity';
import { RequestsStatus } from './entities/requests-status.enum';

import { Repository, FindOptionsWhere, In, DataSource, Not } from 'typeorm';
import { Message } from 'src/chat/entities/message.entity';
import { CreateRequestedTrackInput } from './dto/create-requested-track.input';
import { UpdateRequestedTrackInput } from './dto/update-requested-track.input';
import { RequestedTrack } from './entities/requested-track.entity';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

import { UserRole } from '../users/entities/user-role.enum';
import { PaginationDto } from '../shared/dto/pagination.dto'
import { Chat } from 'src/chat/entities/chat.entity';
import { EventBusService } from 'src/shared/events/event-bus.service';

const requestedTracksRelations: string[] = [
  'requester',
  'track',
  'owner',
  'chat'
]

@Injectable()
export class RequestedTracksService {

  constructor(
    @InjectRepository(RequestedTrack) private readonly requestedTracksRepository: Repository<RequestedTrack>,
    @InjectRepository(Track) private readonly tracksRepository: Repository<Track>,
    @InjectRepository(Chat) private readonly chatRepository: Repository<Chat>,
    @InjectRepository(Message) private readonly messageRepository: Repository<Message>,
    private readonly eventBus: EventBusService,
    private readonly dataSource: DataSource,
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
      select: ['id', 'title'],
      relations: ['authors']
    });

    if (!track) throw new NotFoundException('La pista no existe');

    // Validamos que el solicitante no sea autor de la canción
    const isAuthor = track.authors.some(author => author.id === userRequester.id);
    if (isAuthor) throw new BadRequestException('No puedes solicitar una licencia de tu propia canción');

    // ❌ Evitar duplicados: solo bloquear si ya existe una solicitud ACTIVA (pendiente o aprobada)
    // Si fue rechazada, el usuario puede volver a solicitar la misma pista
    const activeStatuses = [RequestsStatus.PENDIENTE, RequestsStatus.APROBADA];

    const existingActive = await this.requestedTracksRepository.findOne({
      where: {
        requester: { id: userRequester.id },
        track: { id: trackId },
        status: In(activeStatuses),
      }
    });

    if (existingActive) {
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        message: 'Ya tienes una solicitud activa para esta pista',
        details: {
          trackId,
          currentStatus: existingActive.status,
          requestId: existingActive.id,
        }
      });
    }

    // 🔒 Transacción: RequestedTrack + Chat se crean juntos o ninguno se guarda.
    // Esto evita registros huérfanos que causarían falsos 409 en solicitudes futuras.
    const savedId = await this.dataSource.transaction(async (manager) => {
      const newRequestedTrack = manager.create(RequestedTrack, {
        requester: { id: userRequester.id },
        track: { id: trackId },
        licenseType,
      });

      const savedRequestedTrack = await manager.save(RequestedTrack, newRequestedTrack);
      await manager.save(Chat, { request: { id: savedRequestedTrack.id } });

      return savedRequestedTrack.id;
    });

    return await this.findRequestedTrackWithRelations(savedId);
  }

  async findAllRequestedTracksService(
    user: JwtPayload,
    paginationDto: PaginationDto,
  ) {
    const { limit, offset } = paginationDto;

    const isAdmin = user?.role === UserRole.ADMIN;

    // Si no es Admin, filtramos para que vea:
    // 1. Solicitudes que él mismo hizo (requester)
    // 2. Solicitudes hacia sus canciones (autor)
    // 3. Solicitudes donde es un invitado (guest)
    const where: FindOptionsWhere<RequestedTrack> | FindOptionsWhere<RequestedTrack>[] = isAdmin
      ? {}
      : [
          { requester: { id: user.id } },
          { track: { authors: { id: user.id } } },
          { chat: { guests: { id: user.id } } }
        ];

    const [data, total] = await this.requestedTracksRepository.findAndCount({
      where,
      take: limit,
      skip: offset,
      relations: ['track', 'track.authors', 'requester', 'chat']
    });

    const dataWithCounts = await Promise.all(data.map(async (req) => {
      if (!req.chat) return { ...req, unreadCount: 0 };
      
      const unreadCount = await this.messageRepository.count({
        where: {
          chat: { id: req.chat.id },
          isRead: false,
          sender: { id: Not(user.id) }
        }
      });
      
      return { ...req, unreadCount };
    }));

    return {
      data: dataWithCounts,
      total
    };
  }

  async findOneRequestedTracksService(id: string) {
    return await this.findRequestedTrackWithRelations(id)
  }

  async updateRequestedTracksService(id: string, updateRequestedTrackInput: UpdateRequestedTrackInput) {
    const existingRequestedTrack = await this.findRequestedTrackWithRelations(id)

    Object.assign(existingRequestedTrack, updateRequestedTrackInput)

    const updatedRequestedTrack = await this.saveAndReturnWithRelations(existingRequestedTrack)

    this.eventBus.emit('track.request.updated', {
      requestId: updatedRequestedTrack.id,
      chatId: updatedRequestedTrack.chat?.id || '',
      trackTitle: updatedRequestedTrack.track.title,
      status: updatedRequestedTrack.status,
      requesterEmail: updatedRequestedTrack.requester.email,
      requesterName: updatedRequestedTrack.requester.name,
    });

    return updatedRequestedTrack;
  }

  async removeRequestedTracksService(id: string) {
    const requestedTrackToRemove = await this.findRequestedTrackWithRelations(id)

    await this.requestedTracksRepository.softRemove(requestedTrackToRemove)

    return requestedTrackToRemove
  }
}
