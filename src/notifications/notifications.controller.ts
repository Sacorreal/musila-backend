import { Controller, Get, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../users/decorators/current-user.decorator';
import { JWTAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

@Controller('notifications')
@UseGuards(JWTAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(@CurrentUser() user: JwtPayload, @Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.notificationsService.getUserNotifications(user.id, parsedLimit);
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: JwtPayload) {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { count };
  }

  @Patch('read-all')
  async markAllAsRead(@CurrentUser() user: JwtPayload) {
    await this.notificationsService.markAllAsRead(user.id);
    return { success: true };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAsRead(id, user.id);
  }
}
