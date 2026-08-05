import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import { UsersModule } from 'src/users/users.module';
import { EmailModule } from 'src/shared/mail/email.module';
import { ShareManageGuard } from './guards/share-manage.guard';
import { ShareAccessLog } from './entities/share-access-log.entity';
import { ShareAuthorizedRecipient } from './entities/share-authorized-recipient.entity';
import { ShareLink } from './entities/share-link.entity';
import { SharingController } from './sharing.controller';
import { SharingListener } from './listeners/sharing.listener';
import { SharingService } from './sharing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShareLink, ShareAuthorizedRecipient, ShareAccessLog, Playlist, Track, User]),
    EmailModule,
    UsersModule,
  ],
  controllers: [SharingController],
  providers: [SharingService, ShareManageGuard, SharingListener],
  exports: [SharingService],
})
export class SharingModule {}
