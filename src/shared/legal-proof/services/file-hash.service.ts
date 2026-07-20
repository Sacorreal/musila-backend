import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Piscina from 'piscina';
import * as path from 'path';

const DEFAULT_HASH_POOL_SIZE = 2;

@Injectable()
export class FileHashService implements OnModuleDestroy {
  private readonly pool: Piscina;

  constructor(configService: ConfigService) {
    this.pool = new Piscina({
      filename: path.resolve(__dirname, 'workers', 'sha256.worker.js'),
      minThreads: 1,
      maxThreads: configService.get<number>('LEGAL_PROOF_HASH_POOL_SIZE', DEFAULT_HASH_POOL_SIZE),
    });
  }

  /**
   * Corre el hasheo en un worker thread para no bloquear el event loop principal
   * con `crypto.createHash().update()` síncrono sobre buffers grandes (audio).
   * Transfiere el ArrayBuffer al worker (zero-copy) cuando `buffer` lo ocupa
   * completo — que es el caso normal al venir de `fs.readFile` sobre un archivo
   * de varios MB. Si no lo ocupa completo (p. ej. un Buffer recortado de un pool
   * más grande), se copia primero para no transferir memoria ajena al buffer.
   */
  async computeSha256(buffer: Buffer): Promise<string> {
    const transferable = this.toTransferableView(buffer);
    return this.pool.run(transferable, { transferList: [transferable.buffer as ArrayBuffer] });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.close();
  }

  private toTransferableView(buffer: Buffer): Uint8Array {
    const ownsWholeArrayBuffer =
      buffer.byteOffset === 0 && buffer.byteLength === buffer.buffer.byteLength;

    return ownsWholeArrayBuffer ? buffer : Uint8Array.prototype.slice.call(buffer);
  }
}
