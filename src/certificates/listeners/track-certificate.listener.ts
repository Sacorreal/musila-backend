import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { ConcurrencyLimiter } from 'src/shared/utils/concurrency-limiter.util';
import { CertificatesService } from '../certificates.service';

const DEFAULT_CONCURRENCY = 4;

/**
 * Punto de enganche del certificado con la publicación de canciones —
 * mismo esqueleto que `TrackLegalProofListener`: desacoplado vía evento,
 * con `ConcurrencyLimiter` para acotar ráfagas de publicaciones
 * simultáneas. Los errores se manejan íntegramente dentro de
 * `CertificatesService.generateForTrack` (nunca relanzan), porque la
 * publicación de la canción debe seguir siendo válida aunque el
 * certificado falle (Flow 1).
 */
@Injectable()
export class TrackCertificateListener {
  private readonly logger = new Logger(TrackCertificateListener.name);
  private readonly limiter: ConcurrencyLimiter;

  constructor(
    private readonly certificatesService: CertificatesService,
    configService: ConfigService,
  ) {
    this.limiter = new ConcurrencyLimiter(
      configService.get<number>('CERTIFICATE_CONCURRENCY', DEFAULT_CONCURRENCY),
    );
  }

  @EventListener({ event: 'track.created', channel: 'other' })
  async handleTrackCreated(payload: AppEventMap['track.created']): Promise<void> {
    await this.limiter.run(async () => {
      try {
        await this.certificatesService.generateForTrack(payload.trackId, payload.requestedByUserId);
      } catch (error) {
        this.logger.error(`No se pudo generar el certificado para el track ${payload.trackId}`, error as Error);
      }
    });
  }
}
