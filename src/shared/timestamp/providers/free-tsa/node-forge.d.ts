// El paquete "node-forge" no publica tipos propios ni @types en este proyecto.
// Este shim declara únicamente el subconjunto de `forge.asn1`/`forge.util` que
// se usa para construir/parsear estructuras RFC 3161 (TimeStampReq/TimeStampResp)
// en free-tsa-asn1.util.ts. Verificado contra el código fuente instalado
// (node_modules/node-forge/lib/asn1.js y lib/util.js).
declare module 'node-forge' {
  namespace asn1 {
    const Class: {
      readonly UNIVERSAL: number;
      readonly APPLICATION: number;
      readonly CONTEXT_SPECIFIC: number;
      readonly PRIVATE: number;
    };

    const Type: {
      readonly NONE: number;
      readonly BOOLEAN: number;
      readonly INTEGER: number;
      readonly BITSTRING: number;
      readonly OCTETSTRING: number;
      readonly NULL: number;
      readonly OID: number;
      readonly SEQUENCE: number;
      readonly SET: number;
      readonly GENERALIZEDTIME: number;
    };

    interface Asn1 {
      tagClass: number;
      type: number;
      constructed: boolean;
      composed: boolean;
      value: string | Asn1[];
    }

    interface ByteBuffer {
      getBytes(count?: number): string;
      length(): number;
    }

    interface Validator {
      name?: string;
      tagClass?: number;
      type?: number;
      constructed?: boolean;
      optional?: boolean;
      capture?: string;
      captureAsn1?: string;
      value?: Validator[];
    }

    function create(tagClass: number, type: number, constructed: boolean, value: string | Asn1[]): Asn1;
    function toDer(obj: Asn1): ByteBuffer;
    function fromDer(bytes: ByteBuffer | string, options?: Record<string, unknown>): Asn1;
    function validate(
      obj: Asn1,
      validator: Validator,
      capture: Record<string, unknown>,
      errors?: string[],
    ): boolean;
    function oidToDer(oid: string): ByteBuffer;
    function derToOid(bytes: string): string;
    function derToInteger(bytes: string): number;
    function generalizedTimeToDate(gentime: string): Date;
  }

  namespace util {
    function createBuffer(input?: string, encoding?: string): asn1.ByteBuffer;
  }
}
