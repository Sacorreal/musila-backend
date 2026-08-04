import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffAuditLog } from './entities/staff-audit-log.entity';
import { StaffAuditLogFilterDto } from './dto/staff-audit-log-filter.dto';

const EXPORT_ROW_LIMIT = 10_000;

@Injectable()
export class StaffAuditLogService {
  constructor(
    @InjectRepository(StaffAuditLog)
    private readonly repository: Repository<StaffAuditLog>,
  ) {}

  /** Listado paginado y filtrable (Flow 5). Tabla append-only: solo lectura. */
  async findAll(filter: StaffAuditLogFilterDto) {
    const { limit = 10, offset = 0, dateFrom, dateTo, module, action, actorUserId } = filter;

    const qb = this.buildFilteredQuery(filter);
    const [data, total] = await qb
      .orderBy('audit.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    let oldestAvailableRecordAt: Date | undefined;
    if (dateFrom) {
      const oldest = await this.repository
        .createQueryBuilder('audit')
        .select('MIN(audit.createdAt)', 'oldest')
        .getRawOne<{ oldest: Date | null }>();

      if (oldest?.oldest && new Date(oldest.oldest) > new Date(dateFrom)) {
        oldestAvailableRecordAt = oldest.oldest;
      }
    }

    return { data, total, limit, offset, oldestAvailableRecordAt, filters: { dateFrom, dateTo, module, action, actorUserId } };
  }

  /** Usado por el endpoint de export: aplica los mismos filtros sin paginar, con tope duro. */
  async findAllForExport(filter: StaffAuditLogFilterDto): Promise<StaffAuditLog[]> {
    const rows = await this.buildFilteredQuery(filter)
      .orderBy('audit.createdAt', 'DESC')
      .take(EXPORT_ROW_LIMIT + 1)
      .getMany();

    if (rows.length > EXPORT_ROW_LIMIT) {
      throw new BadRequestException(
        `La exportación supera el límite de ${EXPORT_ROW_LIMIT} filas. Aplica filtros más específicos (fecha/módulo/actor) para reducir el rango.`,
      );
    }

    return rows;
  }

  private buildFilteredQuery(filter: StaffAuditLogFilterDto) {
    const { dateFrom, dateTo, module, action, actorUserId } = filter;
    const qb = this.repository.createQueryBuilder('audit');

    if (dateFrom) qb.andWhere('audit.createdAt >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('audit.createdAt <= :dateTo', { dateTo });
    if (module) qb.andWhere('audit.module = :module', { module });
    if (action) qb.andWhere('audit.action ILIKE :action', { action: `%${action}%` });
    if (actorUserId) qb.andWhere('audit.actorUserId = :actorUserId', { actorUserId });

    return qb;
  }
}
