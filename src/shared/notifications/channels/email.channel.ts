import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from 'src/shared/mail/services/email.service';
import { EventListener } from '../../events/decorators/event-listener.decorator';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';

@Injectable()
export class EmailChannel {
  private readonly logger = new Logger(EmailChannel.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) { }

  /**
   * 👤 USER CREATED → EMAIL
   */
  @EventListener({
    event: 'user.invite.created',
    channel: 'email',
  })
  async handleUserCreated(payload: AppEventMap['user.invite.created']) {
    this.logger.log('📧 evento user created disparado');

    await this.emailService.sendInviteEmail([], {
      invitedByName: payload.email,
      inviteUrl: payload.name,
    });
  }

  /**
   * 🧪 TEST EVENT
   */
  @EventListener({
    event: 'event-test',
    channel: 'email',
  })
  handleTestEvent(payload: { message: string }) {
    this.logger.log(`🧪 Test event: ${payload.message}`);
  }

  /**
   * 🔐 PASSWORD RESET REQUESTED → EMAIL
   */
  @EventListener({
    event: 'user.password.reset.requested',
    channel: 'email',
  })
  async handlePasswordResetRequested(
    payload: AppEventMap['user.password.reset.requested'],
  ) {
    this.logger.log('📧 evento password reset requested disparado 🔐');

    const appWebUrl =
      this.configService.get<string>('WEB_APP_PRODUCTION') ||
      this.configService.get<string>('WEB_APP_LOCAL') ||
      this.configService.get<string>('WEB_APP_DEVELOPMENT');
    const resetUrl = `${appWebUrl}/reset-password?token=${payload.token}`;

    await this.emailService.sendPasswordResetEmail(payload.email, {
      name: payload.name,
      resetUrl,
    });
  }

  /**
   * 🔐 PASSWORD CHANGED → EMAIL
   */
  @EventListener({
    event: 'user.password.changed',
    channel: 'email',
  })
  async handlePasswordChanged(payload: AppEventMap['user.password.changed']) {
    this.logger.log('📧 evento password changed disparado 🔐');

    await this.emailService.sendPasswordChangedEmail(payload.email, {
      name: payload.name,
    });
  }

  /**
   * 🎵 TRACK REQUEST UPDATED → EMAIL
   */
  @EventListener({
    event: 'track.request.updated',
    channel: 'email',
  })
  async handleTrackRequestUpdated(payload: AppEventMap['track.request.updated']) {
    this.logger.log('📧 evento track request updated disparado 🎵');

    const appWebUrl =
      this.configService.get<string>('WEB_APP_PRODUCTION') ||
      this.configService.get<string>('WEB_APP_LOCAL') ||
      this.configService.get<string>('WEB_APP_DEVELOPMENT');
    
    // Suponiendo que la URL para ver la solicitud es algo como /music/solicitudes/[requestId]
    const urlTrackRequest = `${appWebUrl}/music/solicitudes`;

    await this.emailService.sendTrackRequestUpdatedEmail(payload.requesterEmail, {
      trackTitle: payload.trackTitle,
      requesterEmail: payload.requesterEmail,
      status: payload.status,
      urlTrackRequest,
    });
  }
}
