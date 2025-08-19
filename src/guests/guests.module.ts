import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Guest } from './entities/guest.entity';
import { GuestsResolver } from './guests.resolver';
import { GuestsService } from './guests.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Guest]), UsersModule],
  providers: [GuestsResolver, GuestsService],
})
export class GuestsModule {}
