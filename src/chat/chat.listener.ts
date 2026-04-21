import { Injectable } from '@nestjs/common';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatListener {
    constructor(private readonly gateway: ChatGateway) { }

    /**
     * 💬 MENSAJE ENVIADO
     */
    @EventListener({
        event: 'chat.message.sent',
        channel: 'websocket'
    })
    handleMessageSent(payload: {
        chatId: string;
        messageId: string;
        senderId: string;
        content: string;

    }) {
        this.gateway.emitMessage(payload);
    }
}