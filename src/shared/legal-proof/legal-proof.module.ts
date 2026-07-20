import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LegalProof } from './entities/legal-proof.entity';
import { LegalProofService } from './legal-proof.service';
import { FileMetadataService } from './services/file-metadata.service';
import { FileHashService } from './services/file-hash.service';
import { OpenTimestampsService } from './services/opentimestamps.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([LegalProof]), ConfigModule],
  providers: [LegalProofService, FileMetadataService, FileHashService, OpenTimestampsService],
  exports: [LegalProofService],
})
export class LegalProofModule {}
