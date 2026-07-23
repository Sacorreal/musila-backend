import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PlansGuard } from 'src/users/guards/plans.guard';
import { AllowedPlans } from 'src/users/decorators/allowed-plans.decorator';
import { UserPlanType } from 'src/users/entities/user-plan-type.enum';
import { PaginationDto } from 'src/shared/dto/pagination.dto';
import { ChatService } from './chat.service';

/** Solo lectura: los chats son conversaciones reales entre usuarios, no se editan/crean desde el panel. */
@ApiTags('Chats (Admin)')
@UseGuards(JWTAuthGuard, PlansGuard)
@AllowedPlans(UserPlanType.ADMIN)
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
