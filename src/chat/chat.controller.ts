import {
    Controller,
    Post,
    Param,
    Body,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { AddGuestsInput } from './dto/add-guests.input';
import { CurrentUser } from '../users/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

@Controller('chats')
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Post(':chatId/guests')
    async addGuests(
        @Param('chatId') chatId: string,
        @Body() dto: AddGuestsInput,
        @CurrentUser() user: JwtPayload,
    ) {
        return this.chatService.addGuestsToChat(
            user.id,
            chatId,
            dto.guestIds,
        );
    }
}