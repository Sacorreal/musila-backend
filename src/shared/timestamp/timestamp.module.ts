import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FreeTsaProvider } from './providers/free-tsa/free-tsa.provider';
import { OpenTimestampProvider } from './providers/open-timestamp/open-timestamp.provider';
import { timestampProviderFactory } from './timestamp-provider.factory';
import { TimestampService } from './timestamp.service';

@Module({
  imports: [ConfigModule],
  providers: [OpenTimestampProvider, FreeTsaProvider, timestampProviderFactory, TimestampService],
  exports: [TimestampService],
})
export class TimestampModule {}
