import { Injectable, Logger } from '@nestjs/common';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { NotificationsService } from '../notifications.service';
import { NotificationsGateway } from '../notifications.gateway';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';

@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  @EventListener({
    event: 'track.request.created',
    channel: 'in-app',
  })
  async handleTrackRequestCreated(payload: AppEventMap['track.request.created']) {
    try {
      // Notify all authors of the track
      for (const authorId of payload.authorIds) {
        if (authorId === payload.requesterId) continue;

        const notification = await this.notificationsService.createNotification({
          recipient: { id: authorId } as any,
          type: 'track.request.created',
          title: 'Nueva solicitud de uso',
          message: `Han solicitado usar tu pista "${payload.trackTitle}" con licencia ${payload.licenseType}.`,
          link: `/music/solicitudes`,
          data: payload,
        });

        this.notificationsGateway.emitToUser(authorId, 'notification.received', notification);
      }
    } catch (error) {
      this.logger.error('Error procesando notificacion de track.request.created', error);
    }
  }

  @EventListener({
    event: 'track.request.updated',
    channel: 'in-app',
  })
  async handleTrackRequestUpdated(payload: AppEventMap['track.request.updated']) {
    try {
      const notification = await this.notificationsService.createNotification({
        recipient: { id: payload.requesterId } as any,
        type: 'track.request.updated',
        title: 'Actualización de solicitud',
        message: `El estado de tu solicitud para "${payload.trackTitle}" ha cambiado a: ${payload.status}.`,
        link: `/music/solicitudes`,
        data: payload,
      });

      this.notificationsGateway.emitToUser(payload.requesterId, 'notification.received', notification);
    } catch (error) {
      this.logger.error('Error procesando notificacion de track.request.updated', error);
    }
  }

  @EventListener({
    event: 'track.request.price.set',
    channel: 'in-app',
  })
  async handleTrackRequestPriceSet(payload: AppEventMap['track.request.price.set']) {
    try {
      const formatted = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(payload.priceInCOP);
      const notification = await this.notificationsService.createNotification({
        recipient: { id: payload.requesterId } as any,
        type: 'track.request.price.set',
        title: 'Precio de licencia establecido',
        message: `El propietario de "${payload.trackTitle}" estableció un precio de ${formatted} para tu solicitud. Entra para aceptar y pagar.`,
        link: `/music/solicitudes`,
        data: payload,
      });
      this.notificationsGateway.emitToUser(payload.requesterId, 'notification.received', notification);
    } catch (error) {
      this.logger.error('Error procesando notificacion de track.request.price.set', error);
    }
  }

  @EventListener({
    event: 'track.request.license.approved',
    channel: 'in-app',
  })
  async handleTrackRequestLicenseApproved(payload: AppEventMap['track.request.license.approved']) {
    try {
      const notification = await this.notificationsService.createNotification({
        recipient: { id: payload.requesterId } as any,
        type: 'track.request.license.approved',
        title: 'Licencia aprobada',
        message: `Tu pago fue procesado exitosamente. La licencia de "${payload.trackTitle}" ha sido aprobada.`,
        link: `/music/solicitudes`,
        data: payload,
      });
      this.notificationsGateway.emitToUser(payload.requesterId, 'notification.received', notification);
    } catch (error) {
      this.logger.error('Error procesando notificacion de track.request.license.approved', error);
    }
  }

  @EventListener({
    event: 'playlist.user.added',
    channel: 'in-app',
  })
  async handlePlaylistUserAdded(payload: AppEventMap['playlist.user.added']) {
    try {
      const notification = await this.notificationsService.createNotification({
        recipient: { id: payload.guestId } as any,
        type: 'playlist.user.added',
        title: 'Has sido invitado a una playlist',
        message: `${payload.addedBy} te ha invitado a colaborar en la playlist "${payload.playlistTitle}".`,
        link: `/music/playlists`,
        data: payload,
      });

      this.notificationsGateway.emitToUser(payload.guestId, 'notification.received', notification);
    } catch (error) {
      this.logger.error('Error procesando notificacion de playlist.user.added', error);
    }
  }

  @EventListener({
    event: 'playlist.updated',
    channel: 'in-app',
  })
  async handlePlaylistUpdated(payload: AppEventMap['playlist.updated']) {
    this.logger.debug(`Playlist updated event received for ${payload.playlistTitle}.`);
  }
}
