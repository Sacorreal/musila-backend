import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { retryWithBackoff } from 'src/shared/utils/retry-with-backoff.util';
import { withTimeout } from 'src/shared/utils/with-timeout.util';
import { TimestampProvider } from '../../domain/timestamp-provider.interface';
import {
  TimestampEvidence,
  TimestampOptions,
  TimestampResult,
  TimestampVerification,
} from '../../domain/timestamp.types';
import { buildTimeStampRequest, extractTstInfo, parseTimeStampResponse } from './free-tsa-asn1.util';
import { FREE_TSA_OIDS, FREE_TSA_RETRY, FREE_TSA_TIMEOUTS } from './free-tsa.constants';

@Injectable()
export class FreeTsaProvider implements TimestampProvider {
  private readonly logger = new Logger(FreeTsaProvider.name);
  private readonly tsaUrl: string;
  private readonly defaultTimeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.tsaUrl = this.config.get<string>('FREETSA_URL') ?? 'https://freetsa.org/tsr';
    this.defaultTimeoutMs = Number(this.config.get<string>('FREETSA_TIMEOUT_MS') ?? FREE_TSA_TIMEOUTS.CREATE_MS);
  }

  async createTimestamp(hash: Buffer, options?: TimestampOptions): Promise<TimestampResult> {
    const evidence = await retryWithBackoff(
      () => withTimeout(this.createTimestampOnce(hash), options?.timeoutMs ?? this.defaultTimeoutMs, 'FreeTSA timestamp timeout'),
      {
        retries: FREE_TSA_RETRY.MAX_RETRIES,
        baseDelayMs: FREE_TSA_RETRY.BASE_DELAY_MS,
        onRetry: (attempt, error) =>
          this.logger.warn(`FreeTSA stamp intento ${attempt} falló: ${(error as Error).message}`),
      },
    );
    return { provider: 'freetsa', evidence };
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- la interfaz exige Promise; extractTstInfo es síncrono.
  async verifyTimestamp(evidence: TimestampEvidence): Promise<TimestampVerification> {
    try {
      const tstInfo = extractTstInfo(evidence.evidence);

      if (tstInfo.hashAlgorithmOid !== FREE_TSA_OIDS.SHA256) {
        return { verified: false, reason: `hashAlgorithm inesperado: ${tstInfo.hashAlgorithmOid}` };
      }

      const hashMatches = Buffer.compare(tstInfo.hashedMessage, evidence.hash) === 0;
      if (!hashMatches) {
        return { verified: false, reason: 'hash_mismatch', timestamp: tstInfo.genTime };
      }

      // Verificación estructural + binding de hash confirmados. La verificación
      // criptográfica de la firma CMS/cadena de confianza del TSA es una limitación
      // conocida y documentada, no implementada aquí (ver plan de diseño).
      return {
        verified: true,
        timestamp: tstInfo.genTime,
        details: { signatureVerified: 'not_attempted' },
      };
    } catch (error) {
      return { verified: false, reason: (error as Error).message };
    }
  }

  private async createTimestampOnce(hash: Buffer): Promise<Buffer> {
    const requestDer = buildTimeStampRequest(hash);

    let res: Response;
    try {
      res = await fetch(this.tsaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/timestamp-query' },
        body: new Uint8Array(requestDer),
      });
    } catch (err) {
      throw new Error(`FreeTSA no está disponible: ${(err as Error).message}`);
    }

    if (!res.ok) {
      throw new Error(`FreeTSA respondió ${res.status}`);
    }

    const responseDer = Buffer.from(await res.arrayBuffer());
    const parsed = parseTimeStampResponse(responseDer);

    if (parsed.statusCode !== 0 || !parsed.timeStampToken) {
      throw new Error(`FreeTSA rechazó la solicitud (status=${parsed.statusCode})`);
    }

    return parsed.timeStampToken;
  }
}
