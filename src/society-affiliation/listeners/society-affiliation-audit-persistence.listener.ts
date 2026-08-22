import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppEventMap, SocietyAffiliationEventPayload } from 'src/shared/events/contracts/app-event-map';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { SocietyAffiliationAuditLog } from '../entities/society-affiliation-audit-log.entity';

/**
 * Persiste los eventos `society-affiliation.*` en `society_affiliation_audit_logs`
 * (§13). Desacoplado del service que los emite — mismo patrón que
 * `StaffAuditPersistenceListener`, pero para acciones de autor/self-service
 * en vez de acciones de staff.
 */
@Injectable()
export class SocietyAffiliationAuditPersistenceListener {
  private readonly logger = new Logger(SocietyAffiliationAuditPersistenceListener.name);

  constructor(
    @InjectRepository(SocietyAffiliationAuditLog)
    private readonly auditLogRepository: Repository<SocietyAffiliationAuditLog>,
  ) {}

  @EventListener({ event: 'society-affiliation.created', channel: 'other' })
  async handleCreated(payload: AppEventMap['society-affiliation.created']) {
    await this.persist('SOCIETY_AFFILIATION_CREATED', payload);
  }

  @EventListener({ event: 'society-affiliation.updated', channel: 'other' })
  async handleUpdated(payload: AppEventMap['society-affiliation.updated']) {
    await this.persist('SOCIETY_AFFILIATION_UPDATED', payload);
  }

  @EventListener({ event: 'society-affiliation.ended', channel: 'other' })
  async handleEnded(payload: AppEventMap['society-affiliation.ended']) {
    await this.persist('SOCIETY_AFFILIATION_ENDED', payload);
  }

  @EventListener({ event: 'society-affiliation.verified', channel: 'other' })
  async handleVerified(payload: AppEventMap['society-affiliation.verified']) {
    await this.persist('SOCIETY_AFFILIATION_VERIFIED', payload);
  }

  @EventListener({ event: 'society-affiliation.rejected', channel: 'other' })
  async handleRejected(payload: AppEventMap['society-affiliation.rejected']) {
    await this.persist('SOCIETY_AFFILIATION_REJECTED', payload);
  }

  private async persist(eventType: string, payload: SocietyAffiliationEventPayload): Promise<void> {
    try {
      await this.auditLogRepository.save({
        eventType,
        actorId: payload.actorId,
        authorId: payload.authorId,
        organizationId: payload.organizationId,
        societyAffiliationId: payload.societyAffiliationId,
        societyId: payload.societyId,
        rightsType: payload.rightsType,
        before: payload.before,
        after: payload.after,
      });
    } catch (error) {
      // Un fallo al auditar nunca debe tumbar la acción de negocio ya ejecutada.
      this.logger.error(`No se pudo persistir el registro de auditoría (${eventType})`, error as Error);
    }
  }
}
