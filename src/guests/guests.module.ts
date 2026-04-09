import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitesModule } from 'src/invites/invites.module';
import { User } from 'src/users/entities/user.entity';
import { Guest } from './entities/guest.entity';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Guest, User]),
    InvitesModule,
  ],
  controllers: [GuestsController],
  providers: [GuestsService],
})
export class GuestsModule {}
