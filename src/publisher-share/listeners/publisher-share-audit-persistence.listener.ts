import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { PublisherRelationshipAuditLog } from '../entities/publisher-relationship-audit-log.entity';

/**
 * Persiste los eventos `publisher-share.*` en `publisher_relationship_audit_logs`
 * (Feature 8). Desacoplado del service que los emite — mismo patrón que
 * `SocietyAffiliationAuditPersistenceListener`.
 */
@Injectable()
export class PublisherShareAuditPersistenceListener {
  private readonly logger = new Logger(PublisherShareAuditPersistenceListener.name);

  constructor(
    @InjectRepository(PublisherRelationshipAuditLog)
    private readonly auditLogRepository: Repository<PublisherRelationshipAuditLog>,
  ) {}

  @EventListener({ event: 'publisher-share.confirmed', channel: 'other' })
  async handleConfirmed(payload: AppEventMap['publisher-share.confirmed']) {
    try {
      await this.auditLogRepository.save({
        eventType: 'PUBLISHER_SHARE_CONFIRMED',
        actorId: payload.actorId,
        authorId: payload.userId,
        organizationId: payload.organizationId,
        publisherShareId: payload.publisherShareId,
        before: payload.before,
        after: payload.after,
      });
    } catch (error) {
      // Un fallo al auditar nunca debe tumbar la acción de negocio ya ejecutada.
      this.logger.error('No se pudo persistir el registro de auditoría (PUBLISHER_SHARE_CONFIRMED)', error as Error);
    }
  }
}
