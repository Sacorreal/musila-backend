import * as forge from 'node-forge';
import { ConfigService } from '@nestjs/config';
import { FreeTsaProvider } from './free-tsa.provider';
import { FREE_TSA_OIDS } from './free-tsa.constants';

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

function buildTimeStampTokenDer(tstInfoDer: Buffer): Buffer {
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
    forge.asn1.oidToDer(FREE_TSA_OIDS.CONTENT_TYPE_TST_INFO).getBytes(),
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
    forge.asn1.oidToDer(FREE_TSA_OIDS.CONTENT_TYPE_SIGNED_DATA).getBytes(),
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

function fakeConfig(values: Record<string, string> = {}): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

function mockFetchOnce(status: number, body: Buffer): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    arrayBuffer: () => Promise.resolve(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength)),
  } as unknown as Response);
}

describe('FreeTsaProvider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('createTimestamp', () => {
    it('hace POST a FREETSA_URL con content-type application/timestamp-query y el DER del request', async () => {
      const provider = new FreeTsaProvider(fakeConfig({ FREETSA_URL: 'https://tsa.example/tsr' }));
      const tstInfoDer = buildTstInfoDer('20260101120000Z', FREE_TSA_OIDS.SHA256, Buffer.from('a'.repeat(64), 'hex'));
      const tokenDer = buildTimeStampTokenDer(tstInfoDer);
      const fetchSpy = mockFetchOnce(200, buildTimeStampRespDer(0, tokenDer));

      const result = await provider.createTimestamp(Buffer.from('a'.repeat(64), 'hex'));

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://tsa.example/tsr');
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe('application/timestamp-query');
      expect(init.body).toBeInstanceOf(Uint8Array);

      expect(result.provider).toBe('freetsa');
      expect(Buffer.compare(result.evidence, tokenDer)).toBe(0);
    });

    it('usa https://freetsa.org/tsr por defecto si no hay FREETSA_URL configurada', async () => {
      const provider = new FreeTsaProvider(fakeConfig());
      const tstInfoDer = buildTstInfoDer('20260101120000Z', FREE_TSA_OIDS.SHA256, Buffer.from('b'.repeat(64), 'hex'));
      const tokenDer = buildTimeStampTokenDer(tstInfoDer);
      const fetchSpy = mockFetchOnce(200, buildTimeStampRespDer(0, tokenDer));

      await provider.createTimestamp(Buffer.from('b'.repeat(64), 'hex'));

      expect(fetchSpy.mock.calls[0][0]).toBe('https://freetsa.org/tsr');
    });

    it('reintenta hasta 3 veces con backoff exponencial si el TSA rechaza la solicitud', async () => {
      jest.useFakeTimers();
      const provider = new FreeTsaProvider(fakeConfig());
      const rejectedRespDer = buildTimeStampRespDer(2);
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: () =>
          Promise.resolve(
            rejectedRespDer.buffer.slice(rejectedRespDer.byteOffset, rejectedRespDer.byteOffset + rejectedRespDer.byteLength),
          ),
      } as unknown as Response);

      const promise = provider.createTimestamp(Buffer.from('c'.repeat(64), 'hex'));
      const assertion = expect(promise).rejects.toThrow(/status=2/);

      await jest.advanceTimersByTimeAsync(1_000);
      await jest.advanceTimersByTimeAsync(2_000);
      await jest.advanceTimersByTimeAsync(4_000);

      await assertion;
      expect(global.fetch).toHaveBeenCalledTimes(4); // 1 intento inicial + 3 reintentos
    });

    it('propaga un error legible si la red falla', async () => {
      jest.useFakeTimers();
      const provider = new FreeTsaProvider(fakeConfig());
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('ECONNRESET'));

      const promise = provider.createTimestamp(Buffer.from('d'.repeat(64), 'hex'));
      const assertion = expect(promise).rejects.toThrow(/FreeTSA no está disponible/);

      await jest.advanceTimersByTimeAsync(1_000);
      await jest.advanceTimersByTimeAsync(2_000);
      await jest.advanceTimersByTimeAsync(4_000);

      await assertion;
    });
  });

  describe('verifyTimestamp', () => {
    it('devuelve verified:true cuando el hash coincide con el messageImprint del token', async () => {
      const provider = new FreeTsaProvider(fakeConfig());
      const hash = Buffer.from('e'.repeat(64), 'hex');
      const tstInfoDer = buildTstInfoDer('20260615093000Z', FREE_TSA_OIDS.SHA256, hash);
      const tokenDer = buildTimeStampTokenDer(tstInfoDer);

      const result = await provider.verifyTimestamp({ hash, evidence: tokenDer });

      expect(result.verified).toBe(true);
      expect(result.timestamp).toEqual(new Date(Date.UTC(2026, 5, 15, 9, 30, 0)));
      expect(result.details).toEqual({ signatureVerified: 'not_attempted' });
    });

    it('devuelve verified:false con reason hash_mismatch cuando el hash no coincide', async () => {
      const provider = new FreeTsaProvider(fakeConfig());
      const tstInfoDer = buildTstInfoDer('20260615093000Z', FREE_TSA_OIDS.SHA256, Buffer.from('f'.repeat(64), 'hex'));
      const tokenDer = buildTimeStampTokenDer(tstInfoDer);

      const result = await provider.verifyTimestamp({ hash: Buffer.from('0'.repeat(64), 'hex'), evidence: tokenDer });

      expect(result.verified).toBe(false);
      expect(result.reason).toBe('hash_mismatch');
    });

    it('devuelve verified:false sin propagar la excepción si la evidencia está corrupta', async () => {
      const provider = new FreeTsaProvider(fakeConfig());

      const result = await provider.verifyTimestamp({ hash: Buffer.from('1'.repeat(64), 'hex'), evidence: Buffer.from([0x01, 0x02]) });

      expect(result.verified).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });
});
