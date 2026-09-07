import { Injectable, Logger } from '@nestjs/common';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { EmailService } from 'src/shared/mail/services/email.service';

const WEB_APP_URL = process.env.WEB_APP_PRODUCTION || process.env.WEB_APP_DEVELOPMENT || process.env.WEB_APP_LOCAL;

@Injectable()
export class LicenseContractEmailListener {
  private readonly logger = new Logger(LicenseContractEmailListener.name);

  constructor(private readonly emailService: EmailService) {}

  @EventListener({ event: 'license.contract.preview.generated', channel: 'email' })
  async handlePreviewGenerated(payload: AppEventMap['license.contract.preview.generated']) {
    const signUrl = `${WEB_APP_URL}/music/solicitudes/${payload.requestedTrackId}`;

    for (const signatory of payload.signatories) {
      try {
        await this.emailService.sendLicenseContractSignatureRequestEmail(signatory.email, {
          signerName: signatory.name,
          trackTitle: payload.trackTitle,
          roleLabel: signatory.roleLabel,
          signUrl,
        });
      } catch (error) {
        this.logger.error(`Error enviando email de firma de licencia a ${signatory.email}`, error);
      }
    }
  }

  @EventListener({ event: 'license.contract.signatory.rejected', channel: 'email' })
  async handleSignatoryRejected(payload: AppEventMap['license.contract.signatory.rejected']) {
    try {
      await this.emailService.sendLicenseContractRejectedEmail(payload.ownerEmail, {
        ownerName: payload.ownerName,
        trackTitle: payload.trackTitle,
        rejectedByName: payload.userName,
        reason: payload.reason,
        contractUrl: `${WEB_APP_URL}/music/solicitudes`,
      });
    } catch (error) {
      this.logger.error(`Error enviando email de rechazo de licencia a ${payload.ownerEmail}`, error);
    }
  }

  @EventListener({ event: 'license.contract.signed', channel: 'email' })
  async handleContractSigned(payload: AppEventMap['license.contract.signed']) {
    for (const party of payload.parties) {
      try {
        await this.emailService.sendLicenseContractSignedCopyEmail(party.email, {
          recipientName: party.name,
          trackTitle: payload.trackTitle,
          documentUrl: payload.documentUrl,
        });
      } catch (error) {
        this.logger.error(`Error enviando copia de licencia firmada a ${party.email}`, error);
      }
    }
  }
}
