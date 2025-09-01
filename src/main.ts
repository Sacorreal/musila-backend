import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { graphqlUploadExpress } from 'graphql-upload-ts';
import { AppModule } from './app.module';
import { UsersSeed } from './seeds/users/users.seed';
import { PlaylistsSeed } from './seeds/playlists/playlists.seed';
import { TracksSeed } from './seeds/tracks/tracks.seed';
import { MusicalGenreSeed } from './seeds/musical-genre.ts/musical-genre.seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.enableCors();

  const usersSeed = app.get(UsersSeed);
  await usersSeed.seedUsers()
  console.log('Users Seeded')

  const playlistsSeed = app.get(PlaylistsSeed)
  await playlistsSeed.seedPlaylists()
  console.log('Playlists Seeded')


  const musicalGenreSeed = app.get(MusicalGenreSeed)
  await musicalGenreSeed.seedMusicalGenre()
  console.log('Musical Genre Seeded')

  const tracksSeed = app.get(TracksSeed)
  await tracksSeed.seedTracks()
  console.log('Tracks Seeded')



  app.use(
    graphqlUploadExpress({
      maxFieldSize: 10_000_000,
    }),
  );
  await app.listen(process.env.PORT || 3000);

}
bootstrap();
