import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { MessageInput } from './dto/send-message.input';
import { In, Repository } from 'typeorm';
import { Chat } from './entities/chat.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { ChatParticipantRole } from './types/chat.types';
import { Guest } from 'src/guests/entities/guest.entity';
import { RemoveGuestsInput } from './dto/remove-guests.input'

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly eventBus: EventBusService,
    @InjectRepository(Guest)
    private readonly guestRepository: Repository<Guest>,
  ) { }

  async saveMessage(userId: string, messageInput: MessageInput) {
    try {
      const { chatId, content, type, fileUrl, filekey, fileName } = messageInput;

      const chat = await this.chatRepository.findOne({
        where: { id: chatId },
        relations: ['request', 'request.requester', 'request.owner', 'request.track', 'request.track.authors', 'guests'],
      });

      if (!chat) throw new NotFoundException('No existe el chat');

      const role = this.getUserRole(chat, userId);

      if (!role) {
        console.error(`[ChatService] Permiso denegado para usuario ${userId} en chat ${chatId}`);
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
      console.error('[ChatService] Error al guardar mensaje:', error);
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
    // =====================================================
    // 🔐 VALIDACIÓN DE PERMISOS
    // =====================================================

    const isOwner = chat.request.owner.id === userId;
    const isRequester = chat.request.requester.id === userId;

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
      titleTrack: chat.request.track.title,
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

    // =====================================================
    // 🔐 VALIDACIÓN DE PERMISOS
    // =====================================================

    const isOwner = chat.request.owner.id === userId;
    const isRequester = chat.request.requester.id === userId;

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
      relations: ['request', 'request.requester', 'request.owner', 'guests', 'request.track', 'request.track.authors'],
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
}
