import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { OtpVerification } from './entities/otp-verification.entity';
import { OtpVerificationService } from './otp-verification.service';
import { OtpVerificationController } from './otp-verification.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([OtpVerification, RequestedTrack, User])],
  controllers: [OtpVerificationController],
  providers: [OtpVerificationService],
  exports: [OtpVerificationService],
})
export class OtpVerificationModule {}
