import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimestampModule } from 'src/shared/timestamp/timestamp.module';
import { LegalProof } from './entities/legal-proof.entity';
import { LegalProofService } from './legal-proof.service';
import { FileMetadataService } from './services/file-metadata.service';
import { FileHashService } from './services/file-hash.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([LegalProof]), ConfigModule, TimestampModule],
  providers: [LegalProofService, FileMetadataService, FileHashService],
  exports: [LegalProofService],
})
export class LegalProofModule {}
