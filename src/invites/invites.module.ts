import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Invite } from './entities/invite.entity';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { InviteListener } from './listeners/invite.listener';
import { EmailModule } from 'src/shared/mail/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invite, User]),
    EmailModule,
  ],
  controllers: [InvitesController],
  providers: [InvitesService, InviteListener],
  exports: [InvitesService],
})
export class InvitesModule {}
