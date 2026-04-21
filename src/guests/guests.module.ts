import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitesModule } from 'src/invites/invites.module';
import { User } from 'src/users/entities/user.entity';
import { Guest } from './entities/guest.entity';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';
import { Chat } from 'src/chat/entities/chat.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([Guest, User, Chat]),
    InvitesModule
  ],
  controllers: [GuestsController],
  providers: [GuestsService],
  exports: [GuestsService],
})
export class GuestsModule { }

