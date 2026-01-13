import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './config/database/database.module';
import { GuestsModule } from './guests/guests.module';
import { IntellectualPropertyModule } from './intellectual-property/intellectual-property.module';
import { LanguagesModule } from './language/languages.module';
import { MailModule } from './mail/mail.module';
import { MusicalGenreModule } from './musical-genre/musical-genre.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { RequestedTracksModule } from './requested-tracks/requested-tracks.module';
import { SearchModule } from './search/search.module';
import { SeedsModule } from './seeds/seeds.module';
import { StorageModule } from './storage/storage.module';
import { TracksModule } from './tracks/tracks.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
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
    SeedsModule,
    StorageModule.forRootAsync(),
    SearchModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
