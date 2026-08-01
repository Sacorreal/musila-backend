import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { AuditLog } from './entities/audit-log.entity';
import { UsersController } from './users.controller';
import { MeController } from './me.controller';
import { UsersService } from './users.service';
import { AdminService } from './admin.service';
import { MeService } from './me.service';
import { PlanService } from './plan.service';
import { AuditLogService } from './audit-log.service';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { Payment } from 'src/payments/entities/payment.entity';
import { CreatorIdModule } from 'src/creator-id/creator-id.module';
import { Follow } from 'src/follows/entities/follow.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AuditLog, MusicalGenre, Track, RequestedTrack, Payment, Follow]),
    CreatorIdModule,
  ],
  controllers: [UsersController, MeController],
  providers: [UsersService, AdminService, MeService, PlanService, AuditLogService],
  exports: [TypeOrmModule, UsersService, AdminService, AuditLogService],
})
export class UsersModule {}
