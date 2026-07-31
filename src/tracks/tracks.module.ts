import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { User } from 'src/users/entities/user.entity';
import { Track } from './entities/track.entity';
import { TracksController } from './tracks.controller';
import { TracksService } from './tracks.service';
import { UsersModule } from 'src/users/users.module';
import { CertificatesModule } from 'src/certificates/certificates.module';
import { TrackLegalProofListener } from './listeners/track-legal-proof.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([Track, User, MusicalGenre]),
    UsersModule,
    ConfigModule,
    CertificatesModule,
  ],
  controllers: [TracksController],
  providers: [TracksService, TrackLegalProofListener],
})
export class TracksModule { }
