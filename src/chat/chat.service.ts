import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { MessageInput } from './dto/send-message.input';
import { In, Not, Repository } from 'typeorm';
import { Chat } from './entities/chat.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { EventBusService } from 'src/shared/events/event-bus.service';
import {
  ChatParticipantRole,
  ChatType,
  ConversationItem,
  ConversationParty,
} from './types/chat.types';
import { Guest } from 'src/guests/entities/guest.entity';
import { RemoveGuestsInput } from './dto/remove-guests.input'
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly eventBus: EventBusService,
    @InjectRepository(Guest)
    private readonly guestRepository: Repository<Guest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  /**
   * Inicia (o recupera) un chat directo entre el usuario actual y otro usuario.
   * Semántica get-or-create: si ya existe un chat DIRECT con ambos participantes,
   * se reutiliza en lugar de crear uno nuevo.
   */
  async createOrGetDirectChat(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException(
        'No puedes iniciar una conversación contigo mismo',
      );
    }

    const target = await this.userRepository.findOne({
      where: { id: targetUserId },
    });
    if (!target) {
      throw new NotFoundException('El usuario destino no existe');
    }

    const existing = await this.chatRepository
      .createQueryBuilder('chat')
      .innerJoin('chat.participants', 'p1', 'p1.id = :currentUserId', {
        currentUserId,
      })
      .innerJoin('chat.participants', 'p2', 'p2.id = :targetUserId', {
        targetUserId,
      })
      .where('chat.type = :type', { type: ChatType.DIRECT })
      .getOne();

    if (existing) {
      return { chatId: existing.id };
    }

    const chat = await this.chatRepository.save(
      this.chatRepository.create({
        type: ChatType.DIRECT,
        participants: [
          { id: currentUserId } as User,
          { id: targetUserId } as User,
        ],
      }),
    );

    return { chatId: chat.id };
  }

  /**
   * Lista unificada de conversaciones del usuario: chats de solicitud (REQUEST)
   * y chats directos (DIRECT), en un formato normalizado listo para la UI.
   */
  async findAllForUser(userId: string) {
    const idRows = await this.chatRepository
      .createQueryBuilder('chat')
      .select('chat.id', 'id')
      .leftJoin('chat.request', 'request')
      .leftJoin('request.requester', 'requester')
      .leftJoin('request.owner', 'owner')
      .leftJoin('request.track', 'track')
      .leftJoin('track.authors', 'authors')
      .leftJoin('chat.guests', 'guests')
      .leftJoin('chat.participants', 'participants')
      .where('requester.id = :userId', { userId })
      .orWhere('owner.id = :userId', { userId })
      .orWhere('authors.id = :userId', { userId })
      .orWhere('guests.id = :userId', { userId })
      .orWhere('participants.id = :userId', { userId })
      .distinct(true)
      .getRawMany<{ id: string }>();

    const chatIds = idRows.map((r) => r.id);
    if (!chatIds.length) {
      return { data: [], total: 0 };
    }

    const chats = await this.chatRepository.find({
      where: { id: In(chatIds) },
      relations: [
        'request',
        'request.requester',
        'request.track',
        'request.track.authors',
        'participants',
      ],
    });

    const data = await Promise.all(
      chats.map((chat) => this.toConversationItem(chat, userId)),
    );

    data.sort((a, b) => {
      const ta = a.lastMessageAt ? a.lastMessageAt.getTime() : 0;
      const tb = b.lastMessageAt ? b.lastMessageAt.getTime() : 0;
      return tb - ta;
    });

    return { data, total: data.length };
  }

  private async toConversationItem(
    chat: Chat,
    userId: string,
  ): Promise<ConversationItem> {
    const [unreadCount, lastMessage] = await Promise.all([
      this.messageRepository.count({
        where: {
          chat: { id: chat.id },
          isRead: false,
          sender: { id: Not(userId) },
        },
      }),
      this.messageRepository.findOne({
        where: { chat: { id: chat.id } },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const lastMessageAt = lastMessage?.createdAt ?? chat.createdAt ?? null;

    if (chat.type === ChatType.DIRECT) {
      const other = chat.participants?.find((p) => p.id !== userId) ?? null;
      return {
        chatId: chat.id,
        kind: 'DIRECT',
        otherParty: other ? this.toParty(other) : null,
        track: null,
        status: null,
        unreadCount,
        lastMessageAt,
      };
    }

    const request = chat.request;
    const track = request?.track;
    const authors = track?.authors ?? [];
    const isAuthor = authors.some((a) => a.id === userId);
    const other = isAuthor ? request?.requester : authors[0];

    return {
      chatId: chat.id,
      kind: 'REQUEST',
      otherParty: other ? this.toParty(other) : null,
      track: track ? { title: track.title, coverUrl: track.coverUrl ?? null } : null,
      status: request?.status ?? null,
      unreadCount,
      lastMessageAt,
    };
  }

  private toParty(user: User): ConversationParty {
    return {
      id: user.id,
      name: user.name,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl ?? null,
    };
  }

  async saveMessage(userId: string, messageInput: MessageInput) {
    try {
      const { chatId, content, type, fileUrl, filekey, fileName } = messageInput;

      const chat = await this.chatRepository.findOne({
        where: { id: chatId },
        relations: ['request', 'request.requester', 'request.owner', 'request.track', 'request.track.authors', 'guests', 'participants'],
      });

      if (!chat) throw new NotFoundException('No existe el chat');

      const role = this.getUserRole(chat, userId);

      if (!role) {
        this.logger.warn(`Permiso denegado para usuario ${userId} en chat ${chatId}`);
        throw new ForbiddenException(
          'No tienes permisos para enviar mensajes en este chat',
        );
      }

      const message = await this.messageRepository.save({
        chat: { id: chatId },
        sender: { id: userId },
        content,
        type,
        ...(fileUrl && { fileUrl }),
        ...(filekey && { fileKey: filekey }),
        ...(fileName && { fileName }),
      });

      // 🔥 evento realtime — incluye campos de archivo si los hay
      this.eventBus.emit('chat.message.sent', {
        chatId,
        messageId: message.id,
        senderId: userId,
        content,
        type,
        titleTrack: chat.request?.track?.title || 'Track',
        ...(message.fileUrl && { fileUrl: message.fileUrl }),
        ...(message.fileKey && { fileKey: message.fileKey }),
        ...(message.fileName && { fileName: message.fileName }),
      });

      return message;
    } catch (error) {
      this.logger.error('Error al guardar mensaje de chat:', error);
      throw error;
    }
  }

  async addGuestsToChat(userId: string, chatId: string, guestIds: string[]) {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['request', 'request.requester', 'request.owner', 'guests'],
    });

    if (!chat) {
      throw new NotFoundException('No existe el chat');
    }
    if (!chat.request) {
      throw new BadRequestException(
        'Los invitados solo aplican a chats de solicitud',
      );
    }
    const request = chat.request;
    // =====================================================
    // 🔐 VALIDACIÓN DE PERMISOS
    // =====================================================

    const isOwner = request.owner.id === userId;
    const isRequester = request.requester.id === userId;

    if (!isOwner && !isRequester) {
      throw new ForbiddenException('No tienes permisos para agregar invitados');
    }

    // =====================================================
    // 🔍 CARGAR GUESTS
    // =====================================================

    const guests = await this.guestRepository.findBy({
      id: In(guestIds),
    });

    if (!guests.length) {
      throw new NotFoundException('No se encontraron invitados');
    }

    // =====================================================
    // 🔄 MERGE (evitar duplicados)
    // =====================================================

    const existingIds = new Set(chat.guests?.map((g) => g.id));

    const newGuests = guests.filter((g) => !existingIds.has(g.id));

    chat.guests = [...(chat.guests || []), ...newGuests];

    await this.chatRepository.save(chat);

    // =====================================================
    // 📡 EVENTO
    // =====================================================

    this.eventBus.emit('chat.guests.added', {
      chatId,
      guestIds: newGuests.map((g) => g.id),
      addedBy: userId,
      titleTrack: request.track?.title ?? 'Track',
      emailGuest: guests.map((g) => g.email),
    });

    return {
      chatId,
      added: newGuests.length,
    };
  }

  private getUserRole(chat: Chat, userId: string): ChatParticipantRole | null {
    // Es el solicitante del track
    if (chat.request?.requester?.id === userId) return 'REQUESTER';

    // Es el dueño explícito (si se asignó)
    if (chat.request?.owner?.id === userId) return 'OWNER';

    // Fallback: es autor del track (owner nunca se asigna explícitamente en la BD)
    const isTrackAuthor = chat.request?.track?.authors?.some((a) => a.id === userId);
    if (isTrackAuthor) return 'OWNER';

    // Es un invitado al chat
    const isInvited = chat.guests?.some((guest) => guest.id === userId);
    if (isInvited) return 'INVITED';

    // Es participante directo del chat (chat sin solicitud asociada)
    const isParticipant = chat.participants?.some((p) => p.id === userId);
    if (isParticipant) return 'PARTICIPANT';

    return null;
  }

  async markAsRead(input: { chatId: string; userId: string }) {
    const { chatId, userId } = input;

    // Marcar como leídos TODOS los mensajes del chat que:
    // 1. Pertenecen a este chat
    // 2. NO fueron enviados por el usuario actual (él solo lee los de otros)
    // 3. Aún no están marcados como leídos
    await this.messageRepository
      .createQueryBuilder('message')
      .update()
      .set({ isRead: true })
      .where('message."chatId" = :chatId', { chatId })
      .andWhere('message."senderId" != :userId', { userId })
      .andWhere('message.is_read = false')
      .execute();

    this.eventBus.emit('chat.message.read', {
      chatId,
      userId,
      readAt: new Date(),
    });
  }

  async removeGuestsFromChat(
    userId: string,
    removeGuestInput: RemoveGuestsInput,
    chatId: string
  ) {
    const { guestIds } = removeGuestInput
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: [
        'request',
        'request.requester',
        'request.owner',
        'guests',
      ],
    });

    if (!chat) {
      throw new NotFoundException('No existe el chat');
    }
    if (!chat.request) {
      throw new BadRequestException(
        'Los invitados solo aplican a chats de solicitud',
      );
    }
    const request = chat.request;

    // =====================================================
    // 🔐 VALIDACIÓN DE PERMISOS
    // =====================================================

    const isOwner = request.owner.id === userId;
    const isRequester = request.requester.id === userId;

    if (!isOwner && !isRequester) {
      throw new ForbiddenException(
        'No tienes permisos para remover invitados',
      );
    }

    // =====================================================
    // 🔍 VALIDAR EXISTENCIA EN EL CHAT
    // =====================================================

    const currentGuests = chat.guests || [];

    const guestIdsSet = new Set(guestIds);

    const guestsToRemove = currentGuests.filter((g) =>
      guestIdsSet.has(g.id),
    );

    if (!guestsToRemove.length) {
      throw new NotFoundException(
        'Los invitados no pertenecen a este chat',
      );
    }

    // =====================================================
    // 🔄 REMOVER RELACIÓN
    // =====================================================

    chat.guests = currentGuests.filter(
      (g) => !guestIdsSet.has(g.id),
    );

    await this.chatRepository.save(chat);

    // =====================================================
    // 📡 EVENTO (REALTIME)
    // =====================================================

    this.eventBus.emit('chat.guests.removed', {
      chatId,
      guestIds: guestsToRemove.map((g) => g.id),
      removedBy: userId,
    });

    return {
      chatId,
      removed: guestsToRemove.length,
    };
  }

  async getChatMessages(userId: string, chatId: string) {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId },
      relations: ['request', 'request.requester', 'request.owner', 'guests', 'request.track', 'request.track.authors', 'participants'],
    });

    if (!chat) {
      throw new NotFoundException('No existe el chat');
    }

    const role = this.getUserRole(chat, userId);
    if (!role) {
      throw new ForbiddenException('No tienes permisos para ver este chat');
    }

    // Traer mensajes ordenados por fecha de creación
    return await this.messageRepository.find({
      where: { chat: { id: chatId } },
      relations: ['sender'],
      order: {
        createdAt: 'ASC',
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Lectura para el panel de administración (solo lectura: los chats son
  // conversaciones reales entre usuarios, no se editan/crean a mano).
  // ─────────────────────────────────────────────────────────────────────────────

  async findAllChatsAdmin(pagination: { limit?: number; offset?: number }) {
    const { limit = 10, offset = 0 } = pagination;
    const [data, total] = await this.chatRepository.findAndCount({
      relations: ['request', 'request.requester', 'request.owner', 'request.track', 'guests'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { data, total, limit, offset };
  }

  async getChatMessagesAdmin(chatId: string) {
    const chat = await this.chatRepository.findOne({ where: { id: chatId } });
    if (!chat) throw new NotFoundException('No existe el chat');

    return this.messageRepository.find({
      where: { chat: { id: chatId } },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });
  }
}
