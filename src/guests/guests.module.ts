import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { User } from 'src/users/entities/user.entity';
import { UsersModule } from 'src/users/users.module';
import { Guest } from './entities/guest.entity';
import { GuestsResolver } from './guests.resolver';
import { GuestsService } from './guests.service';

@Module({
  imports: [TypeOrmModule.forFeature([Guest, Playlist, User]), UsersModule],
  providers: [GuestsResolver, GuestsService],
})
export class GuestsModule {}
