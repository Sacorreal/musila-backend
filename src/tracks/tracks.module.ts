import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { Mood } from 'src/moods/entities/mood.entity';
import { Theme } from 'src/themes/entities/theme.entity';
import { User } from 'src/users/entities/user.entity';
import { Track } from './entities/track.entity';
import { TrackPlay } from './entities/track-play.entity';
import { TracksController } from './tracks.controller';
import { TracksService } from './tracks.service';
import { TrackPlaysService } from './track-plays.service';
import { UsersModule } from 'src/users/users.module';
import { CertificatesModule } from 'src/certificates/certificates.module';
import { SplitModule } from 'src/splits/split.module';
import { LegalIdentityModule } from 'src/legal-identity/legal-identity.module';
import { TrackLegalProofListener } from './listeners/track-legal-proof.listener';
import { TrackLegalIdentityGuard } from './guards/track-legal-identity.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Track, TrackPlay, User, MusicalGenre, Mood, Theme]),
    UsersModule,
    ConfigModule,
    CertificatesModule,
    SplitModule,
    LegalIdentityModule,
  ],
  controllers: [TracksController],
  providers: [TracksService, TrackPlaysService, TrackLegalProofListener, TrackLegalIdentityGuard],
  exports: [TrackPlaysService],
})
export class TracksModule { }
