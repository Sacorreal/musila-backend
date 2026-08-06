export type TimestampProviderName = 'opentimestamps' | 'freetsa';

export interface TimestampOptions {
  timeoutMs?: number;
}

export interface TimestampResult {
  provider: TimestampProviderName;
  evidence: Buffer;
}

export interface TimestampEvidence {
  hash: Buffer;
  evidence: Buffer;
}

export interface TimestampVerification {
  verified: boolean;
  timestamp?: Date;
  details?: Record<string, unknown>;
  reason?: string;
}
