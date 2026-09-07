import { Injectable, Logger } from '@nestjs/common';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { SubjectType } from 'src/entitlements/entities/subject-type.enum';
import { AuthorizationCacheService } from '../cache/authorization-cache.service';

@Injectable()
export class AuthorizationCacheInvalidationListener {
  private readonly logger = new Logger(AuthorizationCacheInvalidationListener.name);

  constructor(private readonly cache: AuthorizationCacheService) {}

  @EventListener({ event: 'authorization.role.updated', channel: 'other' })
  handleRoleUpdated(payload: AppEventMap['authorization.role.updated']) {
    this.logger.log(`Invalidando caché de autorización por cambio del rol ${payload.roleId}`);
    this.cache.invalidateAll();
  }

  @EventListener({ event: 'authorization.capability.updated', channel: 'other' })
  handleCapabilityUpdated(payload: AppEventMap['authorization.capability.updated']) {
    this.logger.log(
      `Invalidando caché de autorización por cambio de la capability ${payload.capabilityId}`,
    );
    this.cache.invalidateAll();
  }

  @EventListener({ event: 'authorization.membership.updated', channel: 'other' })
  handleMembershipUpdated(payload: AppEventMap['authorization.membership.updated']) {
    this.cache.invalidateUser(payload.userId);
  }

  @EventListener({ event: 'authorization.subscription.updated', channel: 'other' })
  handleSubscriptionUpdated(payload: AppEventMap['authorization.subscription.updated']) {
    if ((payload.subjectType as SubjectType) === SubjectType.USER) {
      this.cache.invalidateUser(payload.subjectId);
      return;
    }
    // Cambió el plan de una organización: afecta a todos sus miembros.
    this.cache.invalidateAll();
  }
}
