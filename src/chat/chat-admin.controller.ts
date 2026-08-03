import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PlansGuard } from 'src/users/guards/plans.guard';
import { AllowedPlans } from 'src/users/decorators/allowed-plans.decorator';
import { ADMIN_PLAN_TYPES } from 'src/users/entities/user-plan-type.enum';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { ChatService } from './chat.service';

/** Solo lectura: los chats son conversaciones reales entre usuarios, no se editan/crean desde el panel. */
@ApiTags('Chats (Admin)')
@UseGuards(JWTAuthGuard, PlansGuard)
@AllowedPlans(...ADMIN_PLAN_TYPES)
@Controller('chats/admin')
export class ChatAdminController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar todos los chats del sistema (Admin, solo lectura)' })
  async findAllController(@Query() pagination: PaginationDto) {
    return this.chatService.findAllChatsAdmin(pagination);
  }

  @Get(':id/messages')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Ver los mensajes de un chat (Admin, solo lectura)' })
  async getMessagesController(@Param('id') id: string) {
    return this.chatService.getChatMessagesAdmin(id);
  }
}
