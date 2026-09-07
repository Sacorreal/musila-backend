import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import { Certificate } from './entities/certificate.entity';
import { CertificateRecipient } from './entities/certificate-recipient.entity';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { TrackCertificateListener } from './listeners/track-certificate.listener';
import { CertificateEmailListener } from './listeners/certificate-email.listener';

@Module({
  imports: [TypeOrmModule.forFeature([Certificate, CertificateRecipient, Track, User]), ConfigModule],
  controllers: [CertificatesController],
  providers: [CertificatesService, TrackCertificateListener, CertificateEmailListener],
  exports: [CertificatesService],
})
export class CertificatesModule {}
