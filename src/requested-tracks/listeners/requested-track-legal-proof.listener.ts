import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { LegalProofService } from 'src/shared/legal-proof/legal-proof.service';
import { LegalEntityType } from 'src/shared/legal-proof/entities/legal-entity-type.enum';
import { RequestedTrack } from '../entities/requested-track.entity';

/**
 * Genera evidencia legal cuando una solicitud de licencia queda aprobada, sin
 * importar el camino (aprobación manual con OTP, o aprobación automática al
 * confirmarse un pago vía webhook). Relee la entidad completa por id en vez de
 * confiar en la forma del payload del evento, para ser robusto ante ambos casos.
 */
@Injectable()
export class RequestedTrackLegalProofListener {
  private readonly logger = new Logger(RequestedTrackLegalProofListener.name);

  constructor(
    @InjectRepository(RequestedTrack)
    private readonly requestedTrackRepo: Repository<RequestedTrack>,
    private readonly legalProofService: LegalProofService,
  ) {}

  @EventListener({ event: 'track.request.approved', channel: 'other' })
  async handleManualApproval(payload: AppEventMap['track.request.approved']): Promise<void> {
    await this.generateProof(payload.requestId, payload.approvedByUserId);
  }

  @EventListener({ event: 'track.request.license.approved', channel: 'other' })
  async handlePaymentApproval(payload: AppEventMap['track.request.license.approved']): Promise<void> {
    await this.generateProof(payload.requestId, payload.requesterId);
  }

  private async generateProof(requestId: string, approvedByUserId: string): Promise<void> {
    try {
      const requestedTrack = await this.requestedTrackRepo.findOne({
        where: { id: requestId },
        relations: ['track', 'owner', 'requester'],
      });
      if (!requestedTrack) return;

      const snapshot = {
        event: 'license.request.approved',
        requestId: requestedTrack.id,
        trackId: requestedTrack.track.id,
        ownerId: requestedTrack.owner.id,
        requesterId: requestedTrack.requester.id,
        licenseType: requestedTrack.licenseType,
        approvedAt: new Date().toISOString(),
      };
      const buffer = Buffer.from(JSON.stringify(snapshot));
      const fileName = `license-request-${requestedTrack.id}.json`;

      await this.legalProofService.generateProof({
        file: { buffer, fileName, mimeType: 'application/json' },
        metadataPayload: { size: buffer.length, mimeType: 'application/json', fileName },
        context: {
          entityType: LegalEntityType.LICENSE_REQUEST,
          entityId: requestedTrack.id,
          requestedByUserId: approvedByUserId,
        },
      });
    } catch (error) {
      this.logger.error(`No se pudo generar evidencia legal para la solicitud ${requestId}`, error as Error);
    }
  }
}
