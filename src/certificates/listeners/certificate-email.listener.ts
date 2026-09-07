import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { EmailService } from 'src/shared/mail/services/email.service';
import { CertificatesService } from '../certificates.service';
import {
  CERTIFICATE_TECH_SUPPORT_EMAIL_DEFAULT,
  CERTIFICATE_TECH_SUPPORT_EMAIL_ENV,
} from '../constants/certificate.constants';

@Injectable()
export class CertificateEmailListener {
  private readonly logger = new Logger(CertificateEmailListener.name);

  constructor(
    private readonly certificatesService: CertificatesService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  @EventListener({ event: 'certificate.issued', channel: 'email' })
  async handleCertificateIssued(payload: AppEventMap['certificate.issued']): Promise<void> {
    try {
      await this.certificatesService.sendEmails(payload.certificateId);
    } catch (error) {
      this.logger.error(`No se pudieron enviar los correos del certificado ${payload.certificateId}`, error as Error);
    }

    if (payload.incompleteRecipients.length > 0 && payload.requestedByUserEmail) {
      try {
        await this.emailService.sendCertificateCoauthorIncompleteEmail(payload.requestedByUserEmail, {
          userName: '',
          trackTitle: payload.trackTitle,
          incompleteCoauthorNames: payload.incompleteRecipients.map((r) => r.name).join(', '),
        });
      } catch (error) {
        this.logger.error(
          `No se pudo notificar por correo datos incompletos de coautores para el track ${payload.trackId}`,
          error as Error,
        );
      }
    }
  }

  @EventListener({ event: 'certificate.generation.failed', channel: 'email' })
  async handleCertificateGenerationFailed(payload: AppEventMap['certificate.generation.failed']): Promise<void> {
    if (payload.primaryUserEmail) {
      try {
        await this.emailService.sendCertificatePendingEmail(payload.primaryUserEmail, {
          userName: '',
          trackTitle: payload.trackTitle,
        });
      } catch (error) {
        this.logger.error(`No se pudo notificar al usuario sobre el certificado pendiente de "${payload.trackTitle}"`, error as Error);
      }
    }

    const techSupportEmail = this.configService.get<string>(
      CERTIFICATE_TECH_SUPPORT_EMAIL_ENV,
      CERTIFICATE_TECH_SUPPORT_EMAIL_DEFAULT,
    );

    this.logger.error(
      `Certificado de "${payload.trackTitle}" (track ${payload.trackId}) agotó ${payload.attempts} intentos: ${payload.lastError}. Alertando a ${techSupportEmail}.`,
    );

    try {
      await this.emailService.sendCertificateTechAlertEmail(techSupportEmail, {
        trackId: payload.trackId,
        trackTitle: payload.trackTitle,
        attempts: payload.attempts,
        lastError: payload.lastError,
      });
    } catch (error) {
      this.logger.error('No se pudo enviar la alerta al equipo técnico', error as Error);
    }
  }
}
