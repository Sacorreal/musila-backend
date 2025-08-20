import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { GuestsModule } from './guests/guests.module';
import { MusicalGenreModule } from './musical-genre/musical-genre.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { RequestedTracksModule } from './requested-tracks/requested-tracks.module';
import { TracksModule } from './tracks/tracks.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: (() => {
        switch (process.env.NODE_ENV) {
          case 'production':
            return '.env.production';
          case 'development':
          default:
            return '.env.development';
        }
      })(),
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      playground: false,
      introspection: true,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
    }),
    AuthModule,
    UsersModule,
    DatabaseModule,
    TracksModule,
    PlaylistsModule,
    GuestsModule,
    RequestedTracksModule,
    MusicalGenreModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
