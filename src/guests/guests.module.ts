import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitesModule } from 'src/invites/invites.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { User } from 'src/users/entities/user.entity';
import { Guest } from './entities/guest.entity';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Guest, User]),
    InvitesModule,
    NotificationsModule,
  ],
  controllers: [GuestsController],
  providers: [GuestsService],
})
export class GuestsModule {}
