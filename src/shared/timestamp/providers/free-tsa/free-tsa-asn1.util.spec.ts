import * as forge from 'node-forge';
import { buildTimeStampRequest, extractTstInfo, parseTimeStampResponse } from './free-tsa-asn1.util';
import { FREE_TSA_OIDS } from './free-tsa.constants';

// --- Helpers de fixtures: construyen DER sintético con los mismos primitivos
// de node-forge que usa el código de producción, para probar el lado del
// parseo (decoder) de forma autocontenida, sin depender de una captura real.

function buildTstInfoDer(genTime: string, hashAlgorithmOid: string, hashedMessage: Buffer): Buffer {
  const messageImprint = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
      forge.asn1.create(
        forge.asn1.Class.UNIVERSAL,
        forge.asn1.Type.OID,
        false,
        forge.asn1.oidToDer(hashAlgorithmOid).getBytes(),
      ),
    ]),
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OCTETSTRING, false, hashedMessage.toString('binary')),
  ]);
  const version = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.INTEGER, false, String.fromCharCode(1));
  const policy = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.OID,
    false,
    forge.asn1.oidToDer('1.2.3.4').getBytes(),
  );
  const serialNumber = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.INTEGER,
    false,
    String.fromCharCode(1),
  );
  const genTimeNode = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.GENERALIZEDTIME, false, genTime);
  const tstInfo = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
    version,
    policy,
    messageImprint,
    serialNumber,
    genTimeNode,
  ]);
  return Buffer.from(forge.asn1.toDer(tstInfo).getBytes(), 'binary');
}

function buildTimeStampTokenDer(
  tstInfoDer: Buffer,
  opts: { contentTypeOid?: string; eContentTypeOid?: string } = {},
): Buffer {
  const contentTypeOid = opts.contentTypeOid ?? FREE_TSA_OIDS.CONTENT_TYPE_SIGNED_DATA;
  const eContentTypeOid = opts.eContentTypeOid ?? FREE_TSA_OIDS.CONTENT_TYPE_TST_INFO;

  const eContent = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.OCTETSTRING,
    false,
    tstInfoDer.toString('binary'),
  );
  const eContentWrapper = forge.asn1.create(forge.asn1.Class.CONTEXT_SPECIFIC, 0, true, [eContent]);
  const eContentType = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.OID,
    false,
    forge.asn1.oidToDer(eContentTypeOid).getBytes(),
  );
  const encapsulatedContentInfo = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
    eContentType,
    eContentWrapper,
  ]);
  const version = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.INTEGER, false, String.fromCharCode(1));
  const digestAlgorithms = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SET, true, []);
  const signedData = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
    version,
    digestAlgorithms,
    encapsulatedContentInfo,
  ]);
  const content = forge.asn1.create(forge.asn1.Class.CONTEXT_SPECIFIC, 0, true, [signedData]);
  const contentType = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.OID,
    false,
    forge.asn1.oidToDer(contentTypeOid).getBytes(),
  );
  const contentInfo = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
    contentType,
    content,
  ]);
  return Buffer.from(forge.asn1.toDer(contentInfo).getBytes(), 'binary');
}

function buildTimeStampRespDer(statusCode: number, timeStampTokenDer?: Buffer): Buffer {
  const status = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.INTEGER,
    false,
    String.fromCharCode(statusCode),
  );
  const pkiStatusInfo = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [status]);
  const children = [pkiStatusInfo];
  if (timeStampTokenDer) {
    children.push(forge.asn1.fromDer(forge.util.createBuffer(timeStampTokenDer.toString('binary'))));
  }
  const resp = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, children);
  return Buffer.from(forge.asn1.toDer(resp).getBytes(), 'binary');
}

const timeStampReqValidator: forge.asn1.Validator = {
  name: 'TimeStampReq',
  tagClass: forge.asn1.Class.UNIVERSAL,
  type: forge.asn1.Type.SEQUENCE,
  constructed: true,
  value: [
    { name: 'version', tagClass: forge.asn1.Class.UNIVERSAL, type: forge.asn1.Type.INTEGER, constructed: false, capture: 'version' },
    {
      name: 'messageImprint',
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
    { name: 'nonce', tagClass: forge.asn1.Class.UNIVERSAL, type: forge.asn1.Type.INTEGER, constructed: false, capture: 'nonce' },
    { name: 'certReq', tagClass: forge.asn1.Class.UNIVERSAL, type: forge.asn1.Type.BOOLEAN, constructed: false, capture: 'certReq' },
  ],
};

describe('buildTimeStampRequest', () => {
  it('construye un TimeStampReq con OID sha256, el hash correcto y certReq=true por defecto', () => {
    const hash = Buffer.from('a'.repeat(64), 'hex');
    const der = buildTimeStampRequest(hash);

    const obj = forge.asn1.fromDer(forge.util.createBuffer(der.toString('binary')));
    const capture: Record<string, unknown> = {};
    const errors: string[] = [];
    expect(forge.asn1.validate(obj, timeStampReqValidator, capture, errors)).toBe(true);

    expect(forge.asn1.derToOid(capture.hashAlgorithmOid as string)).toBe(FREE_TSA_OIDS.SHA256);
    expect(Buffer.from(capture.hashedMessage as string, 'binary')).toEqual(hash);
    expect((capture.certReq as string).charCodeAt(0)).toBe(0xff);
  });

  it('permite certReq=false', () => {
    const hash = Buffer.from('c'.repeat(64), 'hex');
    const der = buildTimeStampRequest(hash, { certReq: false });

    const obj = forge.asn1.fromDer(forge.util.createBuffer(der.toString('binary')));
    const capture: Record<string, unknown> = {};
    forge.asn1.validate(obj, timeStampReqValidator, capture, []);

    expect((capture.certReq as string).charCodeAt(0)).toBe(0x00);
  });

  it('antepone 0x00 al nonce si el MSB está en 1, para no codificarlo como negativo', () => {
    const hash = Buffer.from('b'.repeat(64), 'hex');
    const nonce = Buffer.from([0xff, 0x01]);
    const der = buildTimeStampRequest(hash, { nonce });

    const obj = forge.asn1.fromDer(forge.util.createBuffer(der.toString('binary')));
    const capture: Record<string, unknown> = {};
    forge.asn1.validate(obj, timeStampReqValidator, capture, []);

    expect(Buffer.from(capture.nonce as string, 'binary')).toEqual(Buffer.concat([Buffer.from([0x00]), nonce]));
  });
});

describe('parseTimeStampResponse', () => {
  it('extrae statusCode=0 y el timeStampToken cuando la respuesta es exitosa', () => {
    const tstInfoDer = buildTstInfoDer('20260101120000Z', FREE_TSA_OIDS.SHA256, Buffer.from('d'.repeat(64), 'hex'));
    const tokenDer = buildTimeStampTokenDer(tstInfoDer);
    const respDer = buildTimeStampRespDer(0, tokenDer);

    const parsed = parseTimeStampResponse(respDer);

    expect(parsed.statusCode).toBe(0);
    expect(parsed.timeStampToken).toBeDefined();
    expect(Buffer.compare(parsed.timeStampToken as Buffer, tokenDer)).toBe(0);
  });

  it('extrae solo el statusCode cuando el TSA rechaza la solicitud (sin timeStampToken)', () => {
    const respDer = buildTimeStampRespDer(2);

    const parsed = parseTimeStampResponse(respDer);

    expect(parsed.statusCode).toBe(2);
    expect(parsed.timeStampToken).toBeUndefined();
  });

  it('lanza si el DER no corresponde a un TimeStampResp válido', () => {
    expect(() => parseTimeStampResponse(Buffer.from([0x30, 0x01, 0x02]))).toThrow();
  });
});

describe('extractTstInfo', () => {
  it('extrae genTime, hashAlgorithmOid y hashedMessage del TSTInfo embebido', () => {
    const hashedMessage = Buffer.from('e'.repeat(64), 'hex');
    const tstInfoDer = buildTstInfoDer('20260615093000Z', FREE_TSA_OIDS.SHA256, hashedMessage);
    const tokenDer = buildTimeStampTokenDer(tstInfoDer);

    const result = extractTstInfo(tokenDer);

    expect(result.hashAlgorithmOid).toBe(FREE_TSA_OIDS.SHA256);
    expect(Buffer.compare(result.hashedMessage, hashedMessage)).toBe(0);
    expect(result.genTime).toEqual(new Date(Date.UTC(2026, 5, 15, 9, 30, 0)));
  });

  it('lanza si el contentType del ContentInfo no es SignedData', () => {
    const tstInfoDer = buildTstInfoDer('20260101120000Z', FREE_TSA_OIDS.SHA256, Buffer.from('f'.repeat(64), 'hex'));
    const tokenDer = buildTimeStampTokenDer(tstInfoDer, { contentTypeOid: '1.2.3.4.5' });

    expect(() => extractTstInfo(tokenDer)).toThrow(/contentType inesperado/);
  });

  it('lanza si el eContentType del EncapsulatedContentInfo no es TSTInfo', () => {
    const tstInfoDer = buildTstInfoDer('20260101120000Z', FREE_TSA_OIDS.SHA256, Buffer.from('0'.repeat(64), 'hex'));
    const tokenDer = buildTimeStampTokenDer(tstInfoDer, { eContentTypeOid: '1.2.3.4.6' });

    expect(() => extractTstInfo(tokenDer)).toThrow(/eContentType inesperado/);
  });
});
