// El paquete "javascript-opentimestamps" no publica tipos propios ni @types.
// Esta declaración fue verificada contra el código fuente instalado (v0.4.5,
// src/open-timestamps.js, src/detached-timestamp-file.js, src/ops.js) y
// contra una llamada real a los calendar servers públicos.
declare module 'javascript-opentimestamps' {
  export class DetachedTimestampFile {
    static fromHash(op: unknown, hash: Buffer): DetachedTimestampFile;
    static deserialize(buffer: Buffer | Uint8Array | number[] | ArrayBuffer): DetachedTimestampFile;
    serializeToBytes(): Uint8Array;
  }

  export namespace Ops {
    class OpSHA256 {}
  }

  export interface VerifyChainResult {
    timestamp: number;
    height: number;
  }

  export type VerifyResult = Record<string, VerifyChainResult>;

  export function stamp(detached: DetachedTimestampFile): Promise<void>;
  export function verify(
    detachedStamped: DetachedTimestampFile,
    detachedOriginal: DetachedTimestampFile,
    options?: Record<string, unknown>,
  ): Promise<VerifyResult>;
}
