import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { StaffUserRole } from 'src/staff-authorization/entities/staff-user-role.entity';
import { StaffAuditLog, StaffAuditOutcome } from '../entities/staff-audit-log.entity';

@Injectable()
export class StaffAuditPersistenceListener {
  private readonly logger = new Logger(StaffAuditPersistenceListener.name);

  constructor(
    @InjectRepository(StaffAuditLog)
    private readonly auditLogRepository: Repository<StaffAuditLog>,
    @InjectRepository(StaffUserRole)
    private readonly staffUserRoleRepository: Repository<StaffUserRole>,
  ) {}

  @EventListener({ event: 'staff.audit.captured', channel: 'other' })
  async handleStaffAuditCaptured(payload: AppEventMap['staff.audit.captured']) {
    try {
      const actorRoleName =
        payload.actorRoleName ?? (await this.resolveActorRoleName(payload.actorUserId));

      await this.auditLogRepository.save({
        actorUserId: payload.actorUserId,
        actorName: payload.actorName,
        actorRoleName,
        module: payload.module,
        action: payload.action,
        httpMethod: payload.httpMethod,
        route: payload.route,
        entityType: payload.entityType,
        entityId: payload.entityId,
        statusCode: payload.statusCode,
        outcome: payload.outcome === 'failure' ? StaffAuditOutcome.FAILURE : StaffAuditOutcome.SUCCESS,
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
        metadata: payload.metadata,
        durationMs: payload.durationMs,
      });
    } catch (error) {
      // Un fallo al auditar nunca debe tumbar la acción de negocio ya ejecutada.
      this.logger.error(
        `No se pudo persistir el registro de auditoría (${payload.module}:${payload.action})`,
        error as Error,
      );
    }
  }

  private async resolveActorRoleName(userId: string): Promise<string | undefined> {
    const assignment = await this.staffUserRoleRepository.findOne({ where: { userId } });
    return assignment?.staffRole?.name;
  }
}
