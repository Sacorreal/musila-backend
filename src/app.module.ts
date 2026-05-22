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

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1000,  limit: 10  },
      { name: 'medium', ttl: 10000, limit: 50  },
      { name: 'long',   ttl: 60000, limit: 200 },
    ]),
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
    ChatModule, 
    AppNotificationsModule
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
