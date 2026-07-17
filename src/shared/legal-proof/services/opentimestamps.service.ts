import { Injectable, Logger } from '@nestjs/common';
import { retryWithBackoff } from 'src/shared/utils/retry-with-backoff.util';
import { withTimeout } from 'src/shared/utils/with-timeout.util';
import { LEGAL_PROOF_TIMEOUTS, OPENTIMESTAMPS_RETRY } from '../constants/legal-proof.constants';

export interface StampResult {
  otsBytes: Buffer;
}

@Injectable()
export class OpenTimestampsService {
  private readonly logger = new Logger(OpenTimestampsService.name);

  /** Punto único de entrada: timeout por intento + retry con backoff exponencial (hasta 3 veces). */
  async stamp(sha256HashHex: string): Promise<StampResult> {
    return retryWithBackoff(
      () =>
        withTimeout(
          this.stampOnce(sha256HashHex),
          LEGAL_PROOF_TIMEOUTS.OPENTIMESTAMPS_MS,
          'OpenTimestamps stamp timeout',
        ),
      {
        retries: OPENTIMESTAMPS_RETRY.MAX_RETRIES,
        baseDelayMs: OPENTIMESTAMPS_RETRY.BASE_DELAY_MS,
        onRetry: (attempt, error) =>
          this.logger.warn(`OpenTimestamps stamp intento ${attempt} falló: ${(error as Error).message}`),
      },
    );
  }

  // Adaptador de "javascript-opentimestamps" (sin tipos publicados, ver el
  // shim en types/javascript-opentimestamps.d.ts). API verificada contra el
  // código fuente instalado (v0.4.5) y contra una llamada real a los
  // calendar servers públicos, que devolvió un .ots válido.
  private async stampOnce(sha256HashHex: string): Promise<StampResult> {
    // Carga perezosa (no en el import top-level) para que el resto de la app
    // pueda arrancar aunque el paquete todavía no esté instalado — solo falla
    // al invocar stamp(), no al bootstrapear Nest.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const OpenTimestamps = require('javascript-opentimestamps') as typeof import('javascript-opentimestamps');
    const hashBytes = Buffer.from(sha256HashHex, 'hex');

    const detached = OpenTimestamps.DetachedTimestampFile.fromHash(
      new OpenTimestamps.Ops.OpSHA256(),
      hashBytes,
    );

    await OpenTimestamps.stamp(detached);

    const otsBytes = Buffer.from(detached.serializeToBytes());
    return { otsBytes };
  }
}
