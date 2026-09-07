import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs/promises';
import { EventListener } from 'src/shared/events/decorators/event-listener.decorator';
import { AppEventMap } from 'src/shared/events/contracts/app-event-map';
import { StorageService } from 'src/shared/storage/storage.service';
import { LegalProofService } from 'src/shared/legal-proof/legal-proof.service';
import { LegalEntityType } from 'src/shared/legal-proof/entities/legal-entity-type.enum';
import { FileMetadataPayload } from 'src/shared/legal-proof/interfaces/file-metadata.interface';
import { ConcurrencyLimiter } from 'src/shared/utils/concurrency-limiter.util';

const DEFAULT_CONCURRENCY = 4;

type AudioTechnicalMetadata = Partial<
  Pick<FileMetadataPayload, 'durationSeconds' | 'format' | 'bitRate' | 'sampleRate' | 'channels' | 'codec'>
>;

/**
 * `music-metadata` es ESM-only. Bajo `module: "commonjs"` (tsconfig del proyecto),
 * TypeScript reescribe `await import(...)` como `require(...)`, lo que revienta con
 * ERR_REQUIRE_ESM en el rango de Node soportado (`engines.node >= 20.11.1` en
 * package.json, anterior a que `require(esm)` fuera estable). Pasar el specifier a
 * través de `Function` evita esa reescritura y fuerza un `import()` nativo real.
 */
const importEsm = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<typeof import('music-metadata')>;

@Injectable()
export class TrackLegalProofListener {
  private readonly logger = new Logger(TrackLegalProofListener.name);
  private readonly limiter: ConcurrencyLimiter;

  constructor(
    private readonly storageService: StorageService,
    private readonly legalProofService: LegalProofService,
    configService: ConfigService,
  ) {
    this.limiter = new ConcurrencyLimiter(
      configService.get<number>('LEGAL_PROOF_CONCURRENCY', DEFAULT_CONCURRENCY),
    );
  }

  /**
   * `track.created` puede dispararse en ráfaga (varios tracks creados casi al mismo
   * tiempo). Cada ejecución descarga el audio completo a memoria para hashearlo, así
   * que sin este límite N ráfagas concurrentes multiplican N veces el uso de RAM del
   * proceso. El límite acota ese pico; el resto de las tareas simplemente espera su turno.
   */
  @EventListener({ event: 'track.created', channel: 'other' })
  async handleTrackCreated(payload: AppEventMap['track.created']): Promise<void> {
    await this.limiter.run(() => this.processTrack(payload));
  }

  private async processTrack(payload: AppEventMap['track.created']): Promise<void> {
    let filePath: string | undefined;

    try {
      const { filePath: tempFilePath, contentType, contentLength } =
        await this.storageService.downloadObjectToTempFile(payload.audioKey);
      filePath = tempFilePath;

      const fileName = path.basename(payload.audioKey);
      const audioMetadata = await this.extractAudioMetadata(filePath);
      const buffer = await fs.readFile(filePath);

      await this.legalProofService.generateProof({
        file: { buffer, fileName, mimeType: contentType },
        metadataPayload: {
          size: contentLength,
          mimeType: contentType,
          fileName,
          ...audioMetadata,
        },
        context: {
          entityType: LegalEntityType.TRACK,
          entityId: payload.trackId,
          requestedByUserId: payload.requestedByUserId,
          sourceFileKey: payload.audioKey,
        },
      });
    } catch (error) {
      this.logger.error(
        `No se pudo generar evidencia legal para el track ${payload.trackId}`,
        error as Error,
      );
    } finally {
      if (filePath) await fs.rm(filePath, { force: true });
    }
  }

  /**
   * Extrae metadata técnica (duración, bitrate, etc.) directamente del archivo
   * ya descargado, para no depender de que cada cliente (web, móvil) la calcule
   * y la envíe. Si el parseo falla, la evidencia igual se genera sin estos
   * campos opcionales — el hash y el timestamp son lo que realmente prueba autoría.
   */
  private async extractAudioMetadata(filePath: string): Promise<AudioTechnicalMetadata> {
    try {
      const { parseFile } = await importEsm('music-metadata');
      const { format: audioFormat } = await parseFile(filePath, { duration: true });

      return {
        durationSeconds: audioFormat.duration,
        format: audioFormat.container,
        bitRate: audioFormat.bitrate,
        sampleRate: audioFormat.sampleRate,
        channels: audioFormat.numberOfChannels,
        codec: audioFormat.codec,
      };
    } catch (error) {
      this.logger.warn(`No se pudo extraer metadata de audio de ${filePath}: ${(error as Error).message}`);
      return {};
    }
  }
}
