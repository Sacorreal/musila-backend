import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import * as path from 'path';
import Piscina from 'piscina';

const DEFAULT_POOL_SIZE = 2;
const DEFAULT_EXPIRATION_HOURS = 72;

export interface SignedPaymentLink {
  token: string;
  expiresAt: Date;
}

export interface CollectionTokenInput {
  collectionId: string;
  requestedTrackId: string;
}

/**
 * Firma y verifica el token único del enlace de pago de cada cobro.
 *
 * La firma (HMAC-SHA256) corre en un pool de worker threads (piscina) — mismo
 * patrón que `FileHashService` para el hash de archivos — de modo que el cron
 * que procesa el lote diario de cobros (hasta 1000+ concurrentes) paraleliza la
 * parte CPU-bound del pipeline entre varios hilos en vez de firmar uno por uno
 * en el hilo principal. El resto del pipeline (DB, email, notificaciones) sigue
 * siendo I/O async normal — piscina no aporta nada ahí.
 */
@Injectable()
export class PaymentLinkTokenService implements OnModuleDestroy {
  private readonly logger = new Logger(PaymentLinkTokenService.name);
  private readonly pool: Piscina;
  private readonly secret: string;
  private readonly expirationHours: number;

  constructor(private readonly configService: ConfigService) {
    this.pool = new Piscina({
      filename: path.resolve(__dirname, '..', 'workers', 'sign-payment-link.worker.js'),
      minThreads: 1,
      maxThreads: this.configService.get<number>('LICENSE_COLLECTION_TOKEN_POOL_SIZE', DEFAULT_POOL_SIZE),
    });

    this.expirationHours = this.configService.get<number>(
      'LICENSE_COLLECTION_LINK_EXPIRATION_HOURS',
      DEFAULT_EXPIRATION_HOURS,
    );

    const configuredSecret = this.configService.get<string>('LICENSE_COLLECTION_LINK_SECRET', '');
    if (!configuredSecret) {
      this.logger.warn(
        '[PaymentLinkTokenService] LICENSE_COLLECTION_LINK_SECRET no configurado, usando JWT_SECRET como respaldo',
      );
    }
    this.secret = configuredSecret || this.configService.get<string>('JWT_SECRET', '');
  }

  async sign(input: CollectionTokenInput): Promise<SignedPaymentLink> {
    const expiresAt = new Date(Date.now() + this.expirationHours * 60 * 60 * 1000);
    const token: string = await this.pool.run({
      collectionId: input.collectionId,
      requestedTrackId: input.requestedTrackId,
      secret: this.secret,
      expiresAt: expiresAt.toISOString(),
    });

    return { token, expiresAt };
  }

  /** Firma varios tokens en paralelo entre los hilos del pool. */
  async signBatch(inputs: CollectionTokenInput[]): Promise<Map<string, SignedPaymentLink>> {
    const results = await Promise.all(
      inputs.map(async (input) => [input.collectionId, await this.sign(input)] as const),
    );

    return new Map(results);
  }

  verify(token: string): CollectionTokenInput | null {
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return null;

    const expectedSignature = createHmac('sha256', this.secret).update(payloadB64).digest('base64url');
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      return null;
    }

    try {
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as
        CollectionTokenInput & { exp: string };
      if (new Date(payload.exp).getTime() < Date.now()) return null;
      return { collectionId: payload.collectionId, requestedTrackId: payload.requestedTrackId };
    } catch {
      return null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.close();
  }
}
