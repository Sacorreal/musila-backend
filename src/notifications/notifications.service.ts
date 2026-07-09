import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User } from 'src/users/entities/user.entity';
import { NotificationPaginationDto } from './dto/notification-pagination.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  /** Listado paginado con filtros, para el panel de administración. */
  async findAllAdmin(pagination: NotificationPaginationDto) {
    const { limit = 10, offset = 0, recipientId, type, isRead } = pagination;
    const qb = this.notificationRepository
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.recipient', 'recipient')
      .orderBy('notification.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (recipientId) qb.andWhere('recipient.id = :recipientId', { recipientId });
    if (type) qb.andWhere('notification.type = :type', { type });
    if (isRead !== undefined) qb.andWhere('notification.isRead = :isRead', { isRead });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, limit, offset };
  }

  /** Crea y envía una notificación a un usuario específico (Admin). */
  async createForUser(dto: {
    recipientId: string;
    title: string;
    message: string;
    type?: string;
    link?: string;
    data?: Record<string, unknown>;
  }): Promise<Notification> {
    const recipient = await this.usersRepository.findOne({ where: { id: dto.recipientId } });
    if (!recipient) throw new NotFoundException('El usuario destinatario no existe');

    return this.createNotification({
      recipient,
      title: dto.title,
      message: dto.message,
      type: dto.type ?? 'system',
      link: dto.link,
      data: dto.data,
    });
  }

  async removeAdmin(id: string): Promise<void> {
    const result = await this.notificationRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException('Notificación no encontrada');
  }

  async createNotification(data: Partial<Notification>): Promise<Notification> {
    const notification = this.notificationRepository.create(data);
    return await this.notificationRepository.save(notification);
  }

  async getUserNotifications(userId: string, limit: number = 20): Promise<Notification[]> {
    return await this.notificationRepository.find({
      where: { recipient: { id: userId } },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepository.count({
      where: { recipient: { id: userId }, isRead: false },
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, recipient: { id: userId } },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.isRead = true;
    return await this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { recipient: { id: userId }, isRead: false },
      { isRead: true },
    );
  }
}
