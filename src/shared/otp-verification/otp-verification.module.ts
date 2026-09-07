import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { SplitAuthor } from 'src/splits/entities/split-author.entity';
import { LicenseContractSignatory } from 'src/license-contracts/entities/license-contract-signatory.entity';
import { OtpVerification } from './entities/otp-verification.entity';
import { OtpVerificationService } from './otp-verification.service';
import { OtpVerificationController } from './otp-verification.controller';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([OtpVerification, RequestedTrack, SplitAuthor, LicenseContractSignatory, User]),
  ],
  controllers: [OtpVerificationController],
  providers: [OtpVerificationService],
  exports: [OtpVerificationService],
})
export class OtpVerificationModule {}
