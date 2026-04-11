import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './config/database/database.module';
import { GuestsModule } from './guests/guests.module';
import { IntellectualPropertyModule } from './intellectual-property/intellectual-property.module';
import { LanguagesModule } from './language/languages.module';

import { InvitesModule } from './invites/invites.module';
import { MusicalGenreModule } from './musical-genre/musical-genre.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PlaylistCollaboratorsModule } from './playlist-collaborators/playlist-collaborators.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { RequestedTracksModule } from './requested-tracks/requested-tracks.module';
import { SearchModule } from './search/search.module';
import { StorageModule } from './storage/storage.module';
import { TracksModule } from './tracks/tracks.module';
import { UsersModule } from './users/users.module';
import { EmailModule} from './mail/email.module'
import { EventBusModule } from './shared/event-bus/event-bus.module';


@Module({
  imports: [
    EventBusModule,
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
    NotificationsModule,
    StorageModule.forRootAsync(),
    SearchModule,   
    EmailModule.forRootAsync(),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
