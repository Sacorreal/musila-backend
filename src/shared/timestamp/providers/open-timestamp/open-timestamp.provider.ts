import { Injectable, Logger } from '@nestjs/common';
import { retryWithBackoff } from 'src/shared/utils/retry-with-backoff.util';
import { withTimeout } from 'src/shared/utils/with-timeout.util';
import { TimestampProvider } from '../../domain/timestamp-provider.interface';
import {
  TimestampEvidence,
  TimestampOptions,
  TimestampResult,
  TimestampVerification,
} from '../../domain/timestamp.types';
import { OPEN_TIMESTAMP_RETRY, OPEN_TIMESTAMP_TIMEOUTS } from './open-timestamp.constants';

@Injectable()
export class OpenTimestampProvider implements TimestampProvider {
  private readonly logger = new Logger(OpenTimestampProvider.name);

  /** Punto único de entrada: timeout por intento + retry con backoff exponencial (hasta 3 veces). */
  async createTimestamp(hash: Buffer, options?: TimestampOptions): Promise<TimestampResult> {
    const evidence = await retryWithBackoff(
      () =>
        withTimeout(
          this.createTimestampOnce(hash),
          options?.timeoutMs ?? OPEN_TIMESTAMP_TIMEOUTS.CREATE_MS,
          'OpenTimestamps stamp timeout',
        ),
      {
        retries: OPEN_TIMESTAMP_RETRY.MAX_RETRIES,
        baseDelayMs: OPEN_TIMESTAMP_RETRY.BASE_DELAY_MS,
        onRetry: (attempt, error) =>
          this.logger.warn(`OpenTimestamps stamp intento ${attempt} falló: ${(error as Error).message}`),
      },
    );
    return { provider: 'opentimestamps', evidence };
  }

  async verifyTimestamp(evidence: TimestampEvidence): Promise<TimestampVerification> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const OpenTimestamps = require('javascript-opentimestamps') as typeof import('javascript-opentimestamps');
      const detachedOriginal = OpenTimestamps.DetachedTimestampFile.fromHash(
        new OpenTimestamps.Ops.OpSHA256(),
        evidence.hash,
      );
      const detachedStamped = OpenTimestamps.DetachedTimestampFile.deserialize(evidence.evidence);

      const attestationsByChain = await withTimeout(
        OpenTimestamps.verify(detachedStamped, detachedOriginal, {}),
        OPEN_TIMESTAMP_TIMEOUTS.VERIFY_MS,
        'OpenTimestamps verify timeout',
      );

      const chains = Object.keys(attestationsByChain);
      if (chains.length === 0) {
        return { verified: false, reason: 'pending_confirmation', details: attestationsByChain };
      }

      const earliest = chains
        .map((chain) => attestationsByChain[chain])
        .sort((a, b) => a.timestamp - b.timestamp)[0];

      return {
        verified: true,
        timestamp: new Date(earliest.timestamp * 1000),
        details: attestationsByChain,
      };
    } catch (error) {
      return { verified: false, reason: (error as Error).message };
    }
  }

  // Adaptador de "javascript-opentimestamps" (sin tipos publicados, ver el
  // shim en javascript-opentimestamps.d.ts). API verificada contra el código
  // fuente instalado (v0.4.5) y contra una llamada real a los calendar
  // servers públicos, que devolvió un .ots válido.
  private async createTimestampOnce(hash: Buffer): Promise<Buffer> {
    // Carga perezosa (no en el import top-level) para que el resto de la app
    // pueda arrancar aunque el paquete todavía no esté instalado — solo falla
    // al invocar createTimestamp(), no al bootstrapear Nest.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const OpenTimestamps = require('javascript-opentimestamps') as typeof import('javascript-opentimestamps');

    const detached = OpenTimestamps.DetachedTimestampFile.fromHash(new OpenTimestamps.Ops.OpSHA256(), hash);

    await OpenTimestamps.stamp(detached);

    return Buffer.from(detached.serializeToBytes());
  }
}
