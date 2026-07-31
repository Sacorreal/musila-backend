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

  @EventListener({
    event: 'otp.code.issued',
    channel: 'in-app',
  })
  async handleOtpCodeIssued(payload: AppEventMap['otp.code.issued']) {
    try {
      const notification = await this.notificationsService.createNotification({
        recipient: { id: payload.userId } as any,
        type: 'otp.code.issued',
        title: 'Código de verificación',
        message: `Tu código para ${payload.purposeLabel} es ${payload.code}. Vence a las ${payload.expiresAt.toLocaleTimeString('es-CO')}.`,
        data: { purposeLabel: payload.purposeLabel, expiresAt: payload.expiresAt },
      });

      this.notificationsGateway.emitToUser(payload.userId, 'notification.received', notification);
    } catch (error) {
      this.logger.error('Error procesando notificacion de otp.code.issued', error);
    }
  }

  @EventListener({
    event: 'split.created',
    channel: 'in-app',
  })
  async handleSplitCreated(payload: AppEventMap['split.created']) {
    try {
      for (const author of payload.authors) {
        if (author.userId === payload.createdByUserId) continue;

        const notification = await this.notificationsService.createNotification({
          recipient: { id: author.userId } as any,
          type: 'split.created',
          title: 'Split de coautoría pendiente de tu aprobación',
          message: `${payload.createdByName} te incluyó en el split de "${payload.trackTitle}" con un ${author.percentage}% como ${author.role}.`,
          link: `/music/tracks/${payload.trackId}`,
          data: payload,
        });

        this.notificationsGateway.emitToUser(author.userId, 'notification.received', notification);
      }
    } catch (error) {
      this.logger.error('Error procesando notificacion de split.created', error);
    }
  }

  @EventListener({
    event: 'split.author.rejected',
    channel: 'in-app',
  })
  async handleSplitAuthorRejected(payload: AppEventMap['split.author.rejected']) {
    try {
      const notification = await this.notificationsService.createNotification({
        recipient: { id: payload.createdByUserId } as any,
        type: 'split.author.rejected',
        title: 'Un coautor rechazó el split',
        message: `${payload.authorName} rechazó su participación en el split de "${payload.trackTitle}": ${payload.reason}`,
        link: `/music/tracks/${payload.trackId}`,
        data: payload,
      });

      this.notificationsGateway.emitToUser(payload.createdByUserId, 'notification.received', notification);
    } catch (error) {
      this.logger.error('Error procesando notificacion de split.author.rejected', error);
    }
  }

  @EventListener({
    event: 'split.completed',
    channel: 'in-app',
  })
  async handleSplitCompleted(payload: AppEventMap['split.completed']) {
    try {
      const notification = await this.notificationsService.createNotification({
        recipient: { id: payload.createdByUserId } as any,
        type: 'split.completed',
        title: 'Split de coautoría completado',
        message: `Todos los coautores aprobaron el split de "${payload.trackTitle}".`,
        link: `/music/tracks/${payload.trackId}`,
        data: payload,
      });

      this.notificationsGateway.emitToUser(payload.createdByUserId, 'notification.received', notification);
    } catch (error) {
      this.logger.error('Error procesando notificacion de split.completed', error);
    }
  }

  @EventListener({
    event: 'license.contract.preview.generated',
    channel: 'in-app',
  })
  async handleLicenseContractPreviewGenerated(payload: AppEventMap['license.contract.preview.generated']) {
    try {
      for (const signatory of payload.signatories) {
        const notification = await this.notificationsService.createNotification({
          recipient: { id: signatory.userId } as any,
          type: 'license.contract.preview.generated',
          title: 'Contrato de licencia pendiente de tu firma',
          message: `El contrato de licencia de primer uso de "${payload.trackTitle}" está listo para tu firma como ${signatory.roleLabel}.`,
          link: `/music/solicitudes/${payload.requestedTrackId}`,
          data: payload,
        });
        this.notificationsGateway.emitToUser(signatory.userId, 'notification.received', notification);
      }
    } catch (error) {
      this.logger.error('Error procesando notificacion de license.contract.preview.generated', error);
    }
  }

  @EventListener({
    event: 'license.contract.signatory.signed',
    channel: 'in-app',
  })
  async handleLicenseContractSignatorySigned(payload: AppEventMap['license.contract.signatory.signed']) {
    this.logger.debug(`${payload.userName} firmó el contrato de "${payload.trackTitle}" (allSigned=${payload.allSigned}).`);
  }

  @EventListener({
    event: 'license.contract.signatory.rejected',
    channel: 'in-app',
  })
  async handleLicenseContractSignatoryRejected(payload: AppEventMap['license.contract.signatory.rejected']) {
    try {
      const notification = await this.notificationsService.createNotification({
        recipient: { id: payload.ownerId } as any,
        type: 'license.contract.signatory.rejected',
        title: 'Rechazaron el contrato de licencia',
        message: `${payload.userName} rechazó el contrato de "${payload.trackTitle}": ${payload.reason}`,
        link: `/music/solicitudes`,
        data: payload,
      });
      this.notificationsGateway.emitToUser(payload.ownerId, 'notification.received', notification);
    } catch (error) {
      this.logger.error('Error procesando notificacion de license.contract.signatory.rejected', error);
    }
  }

  @EventListener({
    event: 'license.contract.signed',
    channel: 'in-app',
  })
  async handleLicenseContractSigned(payload: AppEventMap['license.contract.signed']) {
    try {
      for (const party of payload.parties) {
        const notification = await this.notificationsService.createNotification({
          recipient: { id: party.userId } as any,
          type: 'license.contract.signed',
          title: 'Contrato de licencia firmado',
          message: `Todas las partes firmaron el contrato de licencia de primer uso de "${payload.trackTitle}".`,
          link: `/music/solicitudes/${payload.requestedTrackId}`,
          data: payload,
        });
        this.notificationsGateway.emitToUser(party.userId, 'notification.received', notification);
      }
    } catch (error) {
      this.logger.error('Error procesando notificacion de license.contract.signed', error);
    }
  }

  @EventListener({
    event: 'license.contract.expiration.pending_confirmation',
    channel: 'in-app',
  })
  async handleLicenseContractExpirationPending(
    payload: AppEventMap['license.contract.expiration.pending_confirmation'],
  ) {
    try {
      for (const recipient of [
        { id: payload.ownerId },
        { id: payload.requesterId },
      ]) {
        const notification = await this.notificationsService.createNotification({
          recipient: recipient as any,
          type: 'license.contract.expiration.pending_confirmation',
          title: 'Venció la vigencia de una licencia',
          message: `La vigencia de la licencia de "${payload.trackTitle}" venció sin ISRC registrado. Si ya la grabaste, confirma el ISRC; si no, el propietario puede ofrecerla a otro intérprete.`,
          link: `/music/solicitudes/${payload.requestedTrackId}`,
          data: payload,
        });
        this.notificationsGateway.emitToUser(recipient.id, 'notification.received', notification);
      }
    } catch (error) {
      this.logger.error('Error procesando notificacion de license.contract.expiration.pending_confirmation', error);
    }
  }

  @EventListener({
    event: 'license.contract.fulfilled',
    channel: 'in-app',
  })
  async handleLicenseContractFulfilled(payload: AppEventMap['license.contract.fulfilled']) {
    try {
      const notification = await this.notificationsService.createNotification({
        recipient: { id: payload.otherPartyId } as any,
        type: 'license.contract.fulfilled',
        title: 'ISRC confirmado',
        message: `Se confirmó el ISRC (${payload.isrc}) de la grabación de "${payload.trackTitle}". La licencia quedó cumplida.`,
        link: `/music/solicitudes/${payload.requestedTrackId}`,
        data: payload,
      });
      this.notificationsGateway.emitToUser(payload.otherPartyId, 'notification.received', notification);
    } catch (error) {
      this.logger.error('Error procesando notificacion de license.contract.fulfilled', error);
    }
  }

  @EventListener({
    event: 'certificate.issued',
    channel: 'in-app',
  })
  async handleCertificateIssued(payload: AppEventMap['certificate.issued']) {
    try {
      for (const recipient of payload.recipients) {
        const notification = await this.notificationsService.createNotification({
          recipient: { id: recipient.userId } as any,
          type: 'certificate.issued',
          title: 'Tu certificado de autoría está listo',
          message: `El Certificado de Autoría de "${payload.trackTitle}" ya está disponible para descarga.`,
          link: `/music`,
          data: payload,
        });
        this.notificationsGateway.emitToUser(recipient.userId, 'notification.received', notification);
      }

      if (payload.incompleteRecipients.length > 0 && payload.requestedByUserId) {
        const names = payload.incompleteRecipients.map((r) => r.name).join(', ');
        const notification = await this.notificationsService.createNotification({
          recipient: { id: payload.requestedByUserId } as any,
          type: 'certificate.issued',
          title: 'Completa los datos de tus coautores',
          message: `No enviamos el certificado de "${payload.trackTitle}" a: ${names}. Completa sus datos de identificación para que lo reciban.`,
          link: `/music`,
          data: payload,
        });
        this.notificationsGateway.emitToUser(payload.requestedByUserId, 'notification.received', notification);
      }
    } catch (error) {
      this.logger.error('Error procesando notificacion de certificate.issued', error);
    }
  }

  @EventListener({
    event: 'certificate.generation.failed',
    channel: 'in-app',
  })
  async handleCertificateGenerationFailed(payload: AppEventMap['certificate.generation.failed']) {
    if (!payload.requestedByUserId) return;

    try {
      const notification = await this.notificationsService.createNotification({
        recipient: { id: payload.requestedByUserId } as any,
        type: 'certificate.generation.failed',
        title: 'Tu certificado de autoría tomará un poco más',
        message: `Estamos reintentando generar el Certificado de Autoría de "${payload.trackTitle}". Te avisaremos cuando esté listo.`,
        link: `/music`,
        data: payload,
      });
      this.notificationsGateway.emitToUser(payload.requestedByUserId, 'notification.received', notification);
    } catch (error) {
      this.logger.error('Error procesando notificacion de certificate.generation.failed', error);
    }
  }
}
