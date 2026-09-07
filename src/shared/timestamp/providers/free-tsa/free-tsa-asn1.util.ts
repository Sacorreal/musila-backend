import { randomBytes } from 'crypto';
import * as forge from 'node-forge';
import { FREE_TSA_OIDS } from './free-tsa.constants';

export interface BuildTimeStampRequestOptions {
  nonce?: Buffer;
  certReq?: boolean;
}

export interface ParsedTimeStampResponse {
  statusCode: number;
  timeStampToken?: Buffer;
}

export interface TstInfo {
  genTime: Date;
  hashAlgorithmOid: string;
  hashedMessage: Buffer;
}

/** Codifica un Buffer sin signo como contenido DER de un INTEGER (antepone 0x00 si el MSB está en 1). */
function toDerUnsignedInteger(buf: Buffer): string {
  let bytes = buf;
  while (bytes.length > 1 && bytes[0] === 0x00) bytes = bytes.subarray(1);
  if (bytes[0] & 0x80) bytes = Buffer.concat([Buffer.from([0x00]), bytes]);
  return bytes.toString('binary');
}

/**
 * Construye el DER de un TimeStampReq (RFC 3161):
 * TimeStampReq ::= SEQUENCE { version INTEGER(1), messageImprint MessageImprint,
 *   nonce INTEGER OPTIONAL, certReq BOOLEAN DEFAULT FALSE }
 * (reqPolicy se omite, es opcional).
 */
export function buildTimeStampRequest(hash: Buffer, opts: BuildTimeStampRequestOptions = {}): Buffer {
  const nonceBytes = opts.nonce ?? randomBytes(8);
  const certReq = opts.certReq ?? true;

  const algorithmIdentifier = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
    forge.asn1.create(
      forge.asn1.Class.UNIVERSAL,
      forge.asn1.Type.OID,
      false,
      forge.asn1.oidToDer(FREE_TSA_OIDS.SHA256).getBytes(),
    ),
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.NULL, false, ''),
  ]);

  const messageImprint = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
    algorithmIdentifier,
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OCTETSTRING, false, hash.toString('binary')),
  ]);

  const version = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.INTEGER,
    false,
    String.fromCharCode(0x01),
  );

  const nonce = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.INTEGER,
    false,
    toDerUnsignedInteger(nonceBytes),
  );

  const certReqNode = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.BOOLEAN,
    false,
    String.fromCharCode(certReq ? 0xff : 0x00),
  );

  const timeStampReq = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
    version,
    messageImprint,
    nonce,
    certReqNode,
  ]);

  return Buffer.from(forge.asn1.toDer(timeStampReq).getBytes(), 'binary');
}

const timeStampRespValidator: forge.asn1.Validator = {
  name: 'TimeStampResp',
  tagClass: forge.asn1.Class.UNIVERSAL,
  type: forge.asn1.Type.SEQUENCE,
  constructed: true,
  value: [
    {
      name: 'PKIStatusInfo',
      tagClass: forge.asn1.Class.UNIVERSAL,
      type: forge.asn1.Type.SEQUENCE,
      constructed: true,
      value: [
        {
          name: 'status',
          tagClass: forge.asn1.Class.UNIVERSAL,
          type: forge.asn1.Type.INTEGER,
          constructed: false,
          capture: 'statusCodeDer',
        },
      ],
    },
    {
      // timeStampToken (ContentInfo) es OPTIONAL: se captura completo como sub-árbol.
      name: 'timeStampToken',
      tagClass: forge.asn1.Class.UNIVERSAL,
      type: forge.asn1.Type.SEQUENCE,
      constructed: true,
      optional: true,
      captureAsn1: 'timeStampTokenAsn1',
    },
  ],
};

/** Parsea el DER de un TimeStampResp (RFC 3161): status + timeStampToken (ContentInfo) opcional. */
export function parseTimeStampResponse(der: Buffer): ParsedTimeStampResponse {
  const obj = forge.asn1.fromDer(forge.util.createBuffer(der.toString('binary')));
  const capture: Record<string, unknown> = {};
  const errors: string[] = [];
  if (!forge.asn1.validate(obj, timeStampRespValidator, capture, errors)) {
    throw new Error(`TimeStampResp inválido: ${errors.join('; ')}`);
  }

  const statusCode = forge.asn1.derToInteger(capture.statusCodeDer as string);
  const timeStampTokenAsn1 = capture.timeStampTokenAsn1 as forge.asn1.Asn1 | undefined;
  const timeStampToken = timeStampTokenAsn1
    ? Buffer.from(forge.asn1.toDer(timeStampTokenAsn1).getBytes(), 'binary')
    : undefined;

  return { statusCode, timeStampToken };
}

const signedDataValidator: forge.asn1.Validator = {
  name: 'ContentInfo',
  tagClass: forge.asn1.Class.UNIVERSAL,
  type: forge.asn1.Type.SEQUENCE,
  constructed: true,
  value: [
    {
      name: 'contentType',
      tagClass: forge.asn1.Class.UNIVERSAL,
      type: forge.asn1.Type.OID,
      constructed: false,
      capture: 'contentType',
    },
    {
      name: 'content',
      tagClass: forge.asn1.Class.CONTEXT_SPECIFIC,
      type: 0,
      constructed: true,
      value: [
        {
          name: 'SignedData',
          tagClass: forge.asn1.Class.UNIVERSAL,
          type: forge.asn1.Type.SEQUENCE,
          constructed: true,
          value: [
            { name: 'version', tagClass: forge.asn1.Class.UNIVERSAL, type: forge.asn1.Type.INTEGER, constructed: false },
            { name: 'digestAlgorithms', tagClass: forge.asn1.Class.UNIVERSAL, type: forge.asn1.Type.SET, constructed: true },
            {
              name: 'EncapsulatedContentInfo',
              tagClass: forge.asn1.Class.UNIVERSAL,
              type: forge.asn1.Type.SEQUENCE,
              constructed: true,
              value: [
                {
                  name: 'eContentType',
                  tagClass: forge.asn1.Class.UNIVERSAL,
                  type: forge.asn1.Type.OID,
                  constructed: false,
                  capture: 'eContentType',
                },
                {
                  // eContent [0] EXPLICIT OCTET STRING OPTIONAL
                  name: 'eContentWrapper',
                  tagClass: forge.asn1.Class.CONTEXT_SPECIFIC,
                  type: 0,
                  constructed: true,
                  optional: true,
                  value: [
                    {
                      name: 'eContent',
                      tagClass: forge.asn1.Class.UNIVERSAL,
                      type: forge.asn1.Type.OCTETSTRING,
                      constructed: false,
                      capture: 'eContent',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const tstInfoValidator: forge.asn1.Validator = {
  name: 'TSTInfo',
  tagClass: forge.asn1.Class.UNIVERSAL,
  type: forge.asn1.Type.SEQUENCE,
  constructed: true,
  value: [
    { name: 'version', tagClass: forge.asn1.Class.UNIVERSAL, type: forge.asn1.Type.INTEGER, constructed: false },
    { name: 'policy', tagClass: forge.asn1.Class.UNIVERSAL, type: forge.asn1.Type.OID, constructed: false },
    {
      name: 'MessageImprint',
      tagClass: forge.asn1.Class.UNIVERSAL,
      type: forge.asn1.Type.SEQUENCE,
      constructed: true,
      value: [
        {
          name: 'hashAlgorithm',
          tagClass: forge.asn1.Class.UNIVERSAL,
          type: forge.asn1.Type.SEQUENCE,
          constructed: true,
          value: [
            {
              name: 'algorithm',
              tagClass: forge.asn1.Class.UNIVERSAL,
              type: forge.asn1.Type.OID,
              constructed: false,
              capture: 'hashAlgorithmOid',
            },
          ],
        },
        {
          name: 'hashedMessage',
          tagClass: forge.asn1.Class.UNIVERSAL,
          type: forge.asn1.Type.OCTETSTRING,
          constructed: false,
          capture: 'hashedMessage',
        },
      ],
    },
    { name: 'serialNumber', tagClass: forge.asn1.Class.UNIVERSAL, type: forge.asn1.Type.INTEGER, constructed: false },
    {
      name: 'genTime',
      tagClass: forge.asn1.Class.UNIVERSAL,
      type: forge.asn1.Type.GENERALIZEDTIME,
      constructed: false,
      capture: 'genTime',
    },
  ],
};

/**
 * Extrae el TSTInfo embebido en un TimeStampToken (CMS ContentInfo/SignedData).
 * Verifica que contentType/eContentType correspondan a SignedData/TSTInfo antes de
 * decodificar, y devuelve el messageImprint + genTime atestados por el TSA.
 */
export function extractTstInfo(timeStampTokenDer: Buffer): TstInfo {
  const contentInfoAsn1 = forge.asn1.fromDer(forge.util.createBuffer(timeStampTokenDer.toString('binary')));
  const capture: Record<string, unknown> = {};
  const errors: string[] = [];
  if (!forge.asn1.validate(contentInfoAsn1, signedDataValidator, capture, errors)) {
    throw new Error(`TimeStampToken (CMS SignedData) inválido: ${errors.join('; ')}`);
  }

  const contentType = forge.asn1.derToOid(capture.contentType as string);
  if (contentType !== FREE_TSA_OIDS.CONTENT_TYPE_SIGNED_DATA) {
    throw new Error(`TimeStampToken: contentType inesperado (${contentType})`);
  }
  const eContentType = forge.asn1.derToOid(capture.eContentType as string);
  if (eContentType !== FREE_TSA_OIDS.CONTENT_TYPE_TST_INFO) {
    throw new Error(`TimeStampToken: eContentType inesperado (${eContentType})`);
  }
  if (typeof capture.eContent !== 'string') {
    throw new Error('TimeStampToken: eContent ausente');
  }

  const tstInfoAsn1 = forge.asn1.fromDer(forge.util.createBuffer(capture.eContent));
  const tstCapture: Record<string, unknown> = {};
  const tstErrors: string[] = [];
  if (!forge.asn1.validate(tstInfoAsn1, tstInfoValidator, tstCapture, tstErrors)) {
    throw new Error(`TSTInfo inválido: ${tstErrors.join('; ')}`);
  }

  return {
    genTime: forge.asn1.generalizedTimeToDate(tstCapture.genTime as string),
    hashAlgorithmOid: forge.asn1.derToOid(tstCapture.hashAlgorithmOid as string),
    hashedMessage: Buffer.from(tstCapture.hashedMessage as string, 'binary'),
  };
}
