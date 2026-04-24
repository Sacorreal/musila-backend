import { Controller, Post, Param, Body, Delete, Get, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { AddGuestsInput } from './dto/add-guests.input';
import { CurrentUser } from '../users/decorators/current-user.decorator';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { RemoveGuestsInput } from './dto/remove-guests.input'
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('chats')
@UseGuards(JWTAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  @Post(':chatId/guests')
  async addGuests(
    @Param('chatId') chatId: string,
    @Body() dto: AddGuestsInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.chatService.addGuestsToChat(user.id, chatId, dto.guestIds);
  }

  @Delete(':chatId/guests')
  async removeGuests(
    @Param('chatId') chatId: string,
    @Body() dto: RemoveGuestsInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.chatService.removeGuestsFromChat(user.id, dto, chatId)
  }

  @Get(':chatId/messages')
  async getMessages(
    @Param('chatId') chatId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.chatService.getChatMessages(user.id, chatId);
  }
}
