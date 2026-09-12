import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { User } from './entities/user.entity';
import { UsersController } from './users.controller';
import { MeController } from './me.controller';
import { UsersService } from './users.service';
import { AdminService } from './admin.service';
import { MeService } from './me.service';
import { PlanService } from './plan.service';
import { AuditLogModule } from './audit-log.module';
import { MusicalGenre } from 'src/musical-genre/entities/musical-genre.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { Payment } from 'src/payments/entities/payment.entity';
import { UsernameModule } from 'src/username/username.module';
import { Follow } from 'src/follows/entities/follow.entity';
import { LegalIdentityModule } from 'src/legal-identity/legal-identity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, MusicalGenre, Track, RequestedTrack, Payment, Follow]),
    UsernameModule,
    LegalIdentityModule,
    AuditLogModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController, MeController],
  providers: [UsersService, AdminService, MeService, PlanService],
  exports: [TypeOrmModule, UsersService, AdminService, AuditLogModule],
})
export class UsersModule {}
