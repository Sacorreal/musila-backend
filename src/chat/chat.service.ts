import { Injectable } from '@nestjs/common';

import { SendMessageInput } from './dto/send-message.input'




@Injectable()
export class ChatService {

    async sendMessage(inputMessage: SendMessageInput) {
        const chat = await this.chatRepo.findOne({
            where: { id: chatId },
            relations: ['request', 'request.requester', 'request.owner'],
        });

        if (!chat) throw new NotFoundException();

        // 🔥 validar acceso
        const isParticipant =
            chat.request.requester.id === userId ||
            chat.request.owner.id === userId;

        if (!isParticipant) {
            throw new ForbiddenException();
        }

        const message = await this.messageRepo.save({
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
        });

        return message;
    }

}



