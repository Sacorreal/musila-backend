import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { PlansGuard } from 'src/users/guards/plans.guard';
import { AllowedPlans } from 'src/users/decorators/allowed-plans.decorator';
import { ADMIN_PLAN_TYPES } from 'src/users/entities/user-plan-type.enum';
import { NotificationsService } from './notifications.service';
import { CreateNotificationAdminDto } from './dto/create-notification-admin.dto';
import { NotificationPaginationDto } from './dto/notification-pagination.dto';
import { NotificationsGateway } from './notifications.gateway';

@ApiTags('Notificaciones (Admin)')
@UseGuards(JWTAuthGuard, PlansGuard)
@AllowedPlans(...ADMIN_PLAN_TYPES)
@Controller('notifications/admin')
export class NotificationsAdminController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Listar todas las notificaciones del sistema (Admin)' })
  async findAllController(@Query() pagination: NotificationPaginationDto) {
    return this.notificationsService.findAllAdmin(pagination);
  }

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Crear y enviar una notificación a un usuario (Admin)' })
  async createController(@Body() dto: CreateNotificationAdminDto) {
    const notification = await this.notificationsService.createForUser(dto);
    this.notificationsGateway.emitToUser(dto.recipientId, 'notification.received', notification);
    return notification;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Eliminar una notificación (Admin)' })
  async removeController(@Param('id') id: string) {
    await this.notificationsService.removeAdmin(id);
  }
}
