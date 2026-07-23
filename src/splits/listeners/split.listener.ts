import { Injectable, Logger } from '@nestjs/common';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { EmailService } from 'src/shared/mail/services/email.service';
import { retryWithBackoff } from 'src/shared/utils/retry-with-backoff.util';

const WEB_APP_URL = process.env.WEB_APP_PRODUCTION || process.env.WEB_APP_DEVELOPMENT || process.env.WEB_APP_LOCAL;

@Injectable()
export class SplitListener {
  private readonly logger = new Logger(SplitListener.name);

  constructor(private readonly emailService: EmailService) {}

  @EventListener({ event: 'split.created', channel: 'email' })
  async handleSplitCreated(payload: AppEventMap['split.created']) {
    const splitDetailUrl = `${WEB_APP_URL}/music/tracks/${payload.trackId}`;

    for (const author of payload.authors) {
      if (author.userId === payload.createdByUserId) continue;

      try {
        await this.emailService.sendSplitCoauthorInvitationEmail(author.email, {
          coauthorName: author.name,
          trackTitle: payload.trackTitle,
          adminName: payload.createdByName,
          percentage: author.percentage,
          role: author.role,
          splitDetailUrl,
        });
      } catch (error) {
        this.logger.error(`Error enviando email de invitación de split a ${author.email}`, error);
      }
    }
  }

  @EventListener({ event: 'split.completed', channel: 'email' })
  async handleSplitCompleted(payload: AppEventMap['split.completed']) {
    const splitDetailUrl = `${WEB_APP_URL}/music/tracks/${payload.trackId}`;

    try {
      await retryWithBackoff(
        () =>
          this.emailService.sendSplitCompletedEmail(payload.createdByEmail, {
            adminName: payload.createdByName,
            trackTitle: payload.trackTitle,
            splitDetailUrl,
          }),
        {
          retries: 3,
          baseDelayMs: 1000,
          onRetry: (attempt, error) =>
            this.logger.warn(`Reintento ${attempt} enviando email de split completado a ${payload.createdByEmail}: ${error}`),
        },
      );
    } catch (error) {
      this.logger.error(
        `Se agotaron los reintentos enviando email de split completado a ${payload.createdByEmail}`,
        error,
      );
    }
  }

  @EventListener({ event: 'split.author.rejected', channel: 'email' })
  async handleSplitAuthorRejected(payload: AppEventMap['split.author.rejected']) {
    const splitDetailUrl = `${WEB_APP_URL}/music/tracks/${payload.trackId}`;

    try {
      await this.emailService.sendSplitRejectedEmail(payload.createdByEmail, {
        adminName: payload.createdByName,
        trackTitle: payload.trackTitle,
        coauthorName: payload.authorName,
        rejectionReason: payload.reason,
        splitDetailUrl,
      });
    } catch (error) {
      this.logger.error(`Error enviando email de rechazo de split a ${payload.createdByEmail}`, error);
    }
  }
}
