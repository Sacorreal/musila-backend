import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './shared/config/config.module';
import { DatabaseModule } from './shared/config/database/database.module';
import { GuestsModule } from './guests/guests.module';
import { IntellectualPropertyModule } from './intellectual-property/intellectual-property.module';
import { LanguagesModule } from './shared/language/languages.module';

import { InvitesModule } from './invites/invites.module';
import { MusicalGenreModule } from './musical-genre/musical-genre.module';
import { MoodsModule } from './moods/moods.module';
import { BlogModule } from './blog/blog.module';
import { ThemesModule } from './themes/themes.module';
import { NotificationsModule } from './shared/notifications/notifications.module';
import { PlaylistCollaboratorsModule } from './playlist-collaborators/playlist-collaborators.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { RequestedTracksModule } from './requested-tracks/requested-tracks.module';
import { SearchModule } from './search/search.module';
import { StorageModule } from './shared/storage/storage.module';
import { TracksModule } from './tracks/tracks.module';
import { UsersModule } from './users/users.module';
import { EmailModule} from './shared/mail/email.module'
import { EventBusModule } from './shared/events/event-bus.module';
import { RealtimeModule} from './shared/realtime/realtime.module'
import { ChatModule } from './chat/chat.module';
import { AppNotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { PlanLimitsModule } from './shared/plan-limits/plan-limits.module';
import { PlanLimitsGuard } from './shared/guards/plan-limits.guard';
import { AffiliatesModule } from './affiliates/affiliates.module';
import { LegalProofModule } from './shared/legal-proof/legal-proof.module';
import { PdfModule } from './shared/pdf/pdf.module';
import { OtpModule } from './shared/otp/otp.module';
import { SmsModule } from './shared/sms/sms.module';
import { OtpVerificationModule } from './shared/otp-verification/otp-verification.module';
import { SplitModule } from './splits/split.module';
import { LicenseCollectionsModule } from './license-collections/license-collections.module';
import { LicenseContractsModule } from './license-contracts/license-contracts.module';
import { CertificatesModule } from './certificates/certificates.module';
import { WalletModule } from './wallet/wallet.module';
import { AuthorDashboardModule } from './author-dashboard/author-dashboard.module';
import { PublisherDashboardModule } from './publisher-dashboard/publisher-dashboard.module';
import { EditorialCommandCenterModule } from './editorial-command-center/editorial-command-center.module';
import { EditorialRelationshipsModule } from './editorial-relationships/editorial-relationships.module';
import { FollowsModule } from './follows/follows.module';
import { SharingModule } from './sharing/sharing.module';
import { StaffAuthorizationModule } from './staff-authorization/staff-authorization.module';
import { StaffAuditModule } from './staff-audit/staff-audit.module';
import { PublishingContractsModule } from './publishing-contracts/publishing-contracts.module';
import { RegistrationFileModule } from './registration-file/registration-file.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { EntitlementsModule } from './entitlements/entitlements.module';
import { CommissionModule } from './commission/commission.module';
import { PromotionsModule } from './promotions/promotions.module';
import { PublisherCommissionModule } from './publisher-commission/publisher-commission.module';
import { PublisherShareModule } from './publisher-share/publisher-share.module';
import { CollectiveManagementSocietyModule } from './collective-management-society/collective-management-society.module';
import { SocietyAffiliationModule } from './society-affiliation/society-affiliation.module';
import { BankInformationModule } from './bank-information/bank-information.module';
import { TrackNotesModule } from './track-notes/track-notes.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1000,  limit: 10  },
      { name: 'medium', ttl: 10000, limit: 50  },
      { name: 'long',   ttl: 60000, limit: 200 },
    ]),
    OtpModule,
    SmsModule,
    OtpVerificationModule,
    EventBusModule,
    RealtimeModule,
    NotificationsModule,
    LanguagesModule,
    ConfigModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
    TracksModule,
    PlaylistsModule,
    GuestsModule,
    RequestedTracksModule,
    MusicalGenreModule,
    MoodsModule,
    BlogModule,
    ThemesModule,
    IntellectualPropertyModule,
    InvitesModule,
    PlaylistCollaboratorsModule,
    StorageModule.forRootAsync(),
    SearchModule,   
    EmailModule.forRootAsync(), 
    ChatModule,
    AppNotificationsModule,
    PaymentsModule,
    PlanLimitsModule,
    AffiliatesModule,
    LegalProofModule,
    PdfModule,
    SplitModule,
    LicenseCollectionsModule,
    LicenseContractsModule,
    CertificatesModule,
    WalletModule,
    AuthorDashboardModule,
    PublisherDashboardModule,
    EditorialCommandCenterModule,
    EditorialRelationshipsModule,
    FollowsModule,
    SharingModule,
    StaffAuthorizationModule,
    StaffAuditModule,
    PublishingContractsModule,
    RegistrationFileModule,
    OrganizationsModule,
    EntitlementsModule,
    AuthorizationModule,
    CommissionModule,
    PromotionsModule,
    PublisherCommissionModule,
    PublisherShareModule,
    CollectiveManagementSocietyModule,
    SocietyAffiliationModule,
    BankInformationModule,
    TrackNotesModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useExisting: PlanLimitsGuard },
  ],
})
export class AppModule {}
