import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

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
}
