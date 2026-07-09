import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditLogPaginationDto } from './dto/audit-log-pagination.dto';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async log(
    userId: string,
    action: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
  ): Promise<void> {
    await this.repo.save({ userId, action, metadata, ipAddress });
  }

  /** Listado paginado con filtros, de solo lectura (Admin) — el registro de auditoría es inmutable. */
  async findAllAdmin(pagination: AuditLogPaginationDto) {
    const { limit = 10, offset = 0, userId, action } = pagination;
    const qb = this.repo
      .createQueryBuilder('audit_log')
      .orderBy('audit_log.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (userId) qb.andWhere('audit_log.userId = :userId', { userId });
    if (action) qb.andWhere('audit_log.action ILIKE :action', { action: `%${action}%` });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, limit, offset };
  }
}
