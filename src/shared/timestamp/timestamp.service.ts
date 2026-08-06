import { Inject, Injectable } from '@nestjs/common';
import { TIMESTAMP_PROVIDER, TimestampProvider } from './domain/timestamp-provider.interface';
import { TimestampEvidence, TimestampOptions, TimestampResult, TimestampVerification } from './domain/timestamp.types';

@Injectable()
export class TimestampService {
  constructor(@Inject(TIMESTAMP_PROVIDER) private readonly provider: TimestampProvider) {}

  createTimestamp(hash: Buffer, options?: TimestampOptions): Promise<TimestampResult> {
    return this.provider.createTimestamp(hash, options);
  }

  verifyTimestamp(evidence: TimestampEvidence): Promise<TimestampVerification> {
    return this.provider.verifyTimestamp(evidence);
  }
}
