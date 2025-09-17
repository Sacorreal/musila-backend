import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Guest } from './entities/guest.entity';
import { GuestsResolver } from './guests.resolver';
import { GuestsService } from './guests.service';

@Module({
  imports: [TypeOrmModule.forFeature([Guest, User])],
  providers: [GuestsResolver, GuestsService],
})
export class GuestsModule {}
