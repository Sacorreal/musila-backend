import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './shared/config/config.module';
import { DatabaseModule } from './shared/config/database/database.module';
import { GuestsModule } from './guests/guests.module';
import { IntellectualPropertyModule } from './intellectual-property/intellectual-property.module';
import { LanguagesModule } from './shared/language/languages.module';

import { InvitesModule } from './invites/invites.module';
import { MusicalGenreModule } from './musical-genre/musical-genre.module';
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


@Module({
  imports: [
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
    IntellectualPropertyModule,
    InvitesModule,
    PlaylistCollaboratorsModule,
    StorageModule.forRootAsync(),
    SearchModule,   
    EmailModule.forRootAsync(),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
