import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { Track } from 'src/tracks/entities/track.entity';
import { RegistrationFile } from 'src/registration-file/entities/registration-file.entity';
import { Certificate } from 'src/certificates/entities/certificate.entity';
import { IntellectualProperty } from 'src/intellectual-property/entities/intellectual-property.entity';
import { Split } from 'src/splits/entities/split.entity';
import { Organization } from 'src/organizations/entities/organization.entity';
import { RosterMembership } from 'src/organizations/entities/roster-membership.entity';
import { PublisherShareModule } from 'src/publisher-share/publisher-share.module';
import { HealthScoreCalculatorService } from './health-score-calculator.service';
import { EditorialCommandCenterService } from './editorial-command-center.service';
import { AuthorEditorialCommandCenterController } from './author-editorial-command-center.controller';
import { PublisherEditorialCommandCenterController } from './publisher-editorial-command-center.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Track,
      RegistrationFile,
      Certificate,
      IntellectualProperty,
      Split,
      Organization,
      RosterMembership,
    ]),
    PublisherShareModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [AuthorEditorialCommandCenterController, PublisherEditorialCommandCenterController],
  providers: [HealthScoreCalculatorService, EditorialCommandCenterService],
})
export class EditorialCommandCenterModule {}
