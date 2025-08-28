import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { GuestsModule } from './guests/guests.module';
import { IntellectualPropertyModule } from './intellectual-property/intellectual-property.module';
import { MusicalGenreModule } from './musical-genre/musical-genre.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { RequestedTracksModule } from './requested-tracks/requested-tracks.module';
import { TracksModule } from './tracks/tracks.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './config/database/database.module';
import { GraphqlModule } from './config/graphql/graphql.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    GraphqlModule,
    AuthModule,
    UsersModule,
    TracksModule,
    PlaylistsModule,
    GuestsModule,
    RequestedTracksModule,
    MusicalGenreModule,
    IntellectualPropertyModule,
    StorageModule.forRootAsync(),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
