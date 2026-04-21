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

@Injectable()
export class ChatService {
	constructor(
		@InjectRepository(Chat)
		private readonly chatRepository: Repository<Chat>,
		@InjectRepository(Message)
		private readonly messageRepository: Repository<Message>,
		private readonly eventBus: EventBusService,
		@InjectRepository(Guest)
		private readonly guestRepository: Repository<Guest>
	) { }

	async saveMessage(messageInput: MessageInput) {
		const { userId, chatId, content } = messageInput;
		const chat = await this.chatRepository.findOne({
			where: { id: messageInput.chatId },
			relations: [
				'request',
				'request.requester',
				'request.owner',
			],
		});

		if (!chat) throw new NotFoundException('No existe el chat');

		const role = this.getUserRole(chat, userId);

		if (!role) {
			throw new ForbiddenException(
				'No tienes permisos para enviar mensajes en este chat',
			);
		}

		const message = await this.messageRepository.save({
			chat: { id: chatId },
			sender: { id: userId },
			content,
		});

		// 🔥 evento realtime
		this.eventBus.emit('chat.message.sent', {
			chatId,
			messageId: message.id,
			senderId: userId,
			content,
			titleTrack: chat.request.track.title
		});

		return message;
	}

	async addGuestsToChat(
		userId: string,
		chatId: string,
		guestIds: string[],
	) {
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
				'No tienes permisos para agregar invitados',
			);
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
			emailGuest: guests.map((g) => g.email)
		});

		return {
			chatId,
			added: newGuests.length,
		};
	}

	private getUserRole(chat: Chat, userId: string): ChatParticipantRole | null {
		if (chat.request.requester.id === userId) return 'REQUESTER';

		if (chat.request.owner.id === userId) return 'OWNER';

		const isInvited = chat.guests?.some(
			(guest) => guest.id === userId,
		);
		if (isInvited) return 'INVITED';

		return null;
	}
}
