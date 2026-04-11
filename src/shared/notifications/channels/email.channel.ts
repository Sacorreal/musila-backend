import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EmailService } from 'src/shared/mail/services/email.service';
import { EventBusService } from 'src/shared/event-bus/event-bus.service';

@Injectable()
export class EmailChannel implements OnModuleInit {
  private readonly logger = new Logger(EmailChannel.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly eventBus: EventBusService,
  ) {}
  onModuleInit() {
    this.eventBus.on('notification.user.created', async (payload) => {
      this.logger.log('evento user created disparado 🥳');
      await this.emailService.sendInviteEmail(payload.email, {
        invitedByName: payload.name,
        inviteUrl: payload.role,
      });
    });

    this.eventBus.on('event-test', (payload) =>{
       const mensaje = payload.message
      console.log(mensaje)
    })
  }
}
