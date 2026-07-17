// El paquete "javascript-opentimestamps" no publica tipos propios ni @types.
// Esta declaración fue verificada contra el código fuente instalado (v0.4.5,
// src/open-timestamps.js, src/detached-timestamp-file.js, src/ops.js) y
// contra una llamada real a los calendar servers públicos.
declare module 'javascript-opentimestamps' {
  export class DetachedTimestampFile {
    static fromHash(op: unknown, hash: Buffer): DetachedTimestampFile;
    serializeToBytes(): Uint8Array;
  }

  export namespace Ops {
    class OpSHA256 {}
  }

  export function stamp(detached: DetachedTimestampFile): Promise<void>;
}
