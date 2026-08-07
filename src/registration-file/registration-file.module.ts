import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Track } from 'src/tracks/entities/track.entity';
import { User } from 'src/users/entities/user.entity';
import { PublishingContract } from 'src/publishing-contracts/entities/publishing-contract.entity';
import { SplitAuthor } from 'src/splits/entities/split-author.entity';
import { Split } from 'src/splits/entities/split.entity';

import { RegistrationFile } from './entities/registration-file.entity';
import { RegistrationFileParticipant } from './entities/registration-file-participant.entity';
import { RegistrationFileDocument } from './entities/registration-file-document.entity';
import { RegistrationFileProfileStatus } from './entities/registration-file-profile-status.entity';
import { RegistrationFileController } from './registration-file.controller';
import { RegistrationFileService } from './registration-file.service';
import { RegistrationNumberService } from './registration-number.service';
import { RegistrationCompletenessService } from './services/registration-completeness.service';
import { RegistrationFileDocumentService } from './services/registration-file-document.service';
import { RegistrationFileProfileStatusService } from './services/registration-file-profile-status.service';
import { RegistrationFileGenerationService } from './services/registration-file-generation.service';
import { RegistrationProfileRegistry } from './profiles/registration-profile.registry';
import { SaycoRegistrationProfile } from './profiles/sayco/sayco-registration-profile';
import { DndaRegistrationProfile } from './profiles/dnda/dnda-registration-profile';
import { ManualRegistrationProvider } from './providers/manual/manual-registration.provider';
import { SaycoApiProvider } from './providers/sayco-api/sayco-api.provider';
import { DndaApiProvider } from './providers/dnda-api/dnda-api.provider';
import { registrationProviderFactory } from './registration-provider.factory';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RegistrationFile,
      RegistrationFileParticipant,
      RegistrationFileDocument,
      RegistrationFileProfileStatus,
      Track,
      User,
      PublishingContract,
      SplitAuthor,
      Split,
    ]),
  ],
  controllers: [RegistrationFileController],
  providers: [
    RegistrationFileService,
    RegistrationNumberService,
    RegistrationCompletenessService,
    RegistrationFileDocumentService,
    RegistrationFileProfileStatusService,
    RegistrationFileGenerationService,
    RegistrationProfileRegistry,
    SaycoRegistrationProfile,
    DndaRegistrationProfile,
    ManualRegistrationProvider,
    SaycoApiProvider,
    DndaApiProvider,
    // Proveedor de registro activo, seleccionado vía REGISTRATION_PROVIDER (env var).
    registrationProviderFactory,
  ],
  exports: [RegistrationFileService, RegistrationCompletenessService],
})
export class RegistrationFileModule {}
