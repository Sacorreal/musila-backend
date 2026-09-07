import { Injectable, Logger } from '@nestjs/common';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { StaffPermissionCacheService } from '../cache/staff-permission-cache.service';

@Injectable()
export class StaffCacheInvalidationListener {
  private readonly logger = new Logger(StaffCacheInvalidationListener.name);

  constructor(private readonly cache: StaffPermissionCacheService) {}

  @EventListener({ event: 'staff-role.permissions.changed', channel: 'other' })
  handlePermissionsChanged(payload: AppEventMap['staff-role.permissions.changed']) {
    this.logger.log(`Invalidando caché de permisos del rol ${payload.staffRoleId}`);
    this.cache.invalidateByRole(payload.staffRoleId);
  }

  @EventListener({ event: 'staff-role.deleted', channel: 'other' })
  handleRoleDeleted(payload: AppEventMap['staff-role.deleted']) {
    this.cache.invalidateByRole(payload.staffRoleId);
  }

  @EventListener({ event: 'staff-assignment.changed', channel: 'other' })
  handleAssignmentChanged(payload: AppEventMap['staff-assignment.changed']) {
    this.cache.invalidateUser(payload.userId);
  }
}
