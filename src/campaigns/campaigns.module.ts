import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from '../organizations/entities/organization.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { Trackspace } from '../organizations/entities/trackspace.entity';
import { Track } from '../tracks/entities/track.entity';
import { User } from '../users/entities/user.entity';
import { MusicalGenre } from '../musical-genre/entities/musical-genre.entity';
import { AppNotificationsModule } from '../notifications/notifications.module';
import { RequestedTracksModule } from '../requested-tracks/requested-tracks.module';
import { Campaign } from './entities/campaign.entity';
import { CampaignSubmission } from './entities/campaign-submission.entity';
import { CampaignsService } from './campaigns.service';
import { CampaignSchedulerService } from './campaign-scheduler.service';
import { CampaignNotificationListener } from './listeners/campaign-notification.listener';
import { CampaignLicenseFulfilledListener } from './listeners/campaign-license-fulfilled.listener';
import { CampaignsController } from './campaigns.controller';

/**
 * Módulo de campañas para sellos (buzón de recepción de canciones). Importa
 * `RequestedTracksModule` para reutilizar el flujo de licenciamiento ya
 * implementado al aprobar una postulación — sin reimplementarlo.
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      Campaign,
      CampaignSubmission,
      Organization,
      OrganizationMembership,
      Trackspace,
      Track,
      User,
      MusicalGenre,
    ]),
    RequestedTracksModule,
    AppNotificationsModule,
  ],
  controllers: [CampaignsController],
  providers: [
    CampaignsService,
    CampaignSchedulerService,
    CampaignNotificationListener,
    CampaignLicenseFulfilledListener,
  ],
  exports: [CampaignsService],
})
export class CampaignsModule {}
