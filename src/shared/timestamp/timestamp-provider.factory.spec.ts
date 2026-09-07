import { ConfigService } from '@nestjs/config';
import { timestampProviderFactory } from './timestamp-provider.factory';
import { FreeTsaProvider } from './providers/free-tsa/free-tsa.provider';
import { OpenTimestampProvider } from './providers/open-timestamp/open-timestamp.provider';

describe('timestampProviderFactory', () => {
  const otsInstance = {} as OpenTimestampProvider;
  const freeTsaInstance = {} as FreeTsaProvider;

  function fakeConfig(value: string | undefined): ConfigService {
    return { get: () => value } as unknown as ConfigService;
  }

  it('resuelve OpenTimestampProvider cuando TIMESTAMP_PROVIDER=opentimestamps', () => {
    const result = timestampProviderFactory.useFactory(fakeConfig('opentimestamps'), otsInstance, freeTsaInstance);
    expect(result).toBe(otsInstance);
  });

  it('resuelve OpenTimestampProvider por defecto cuando TIMESTAMP_PROVIDER no está definida', () => {
    const result = timestampProviderFactory.useFactory(fakeConfig(undefined), otsInstance, freeTsaInstance);
    expect(result).toBe(otsInstance);
  });

  it('resuelve FreeTsaProvider cuando TIMESTAMP_PROVIDER=freetsa', () => {
    const result = timestampProviderFactory.useFactory(fakeConfig('freetsa'), otsInstance, freeTsaInstance);
    expect(result).toBe(freeTsaInstance);
  });

  it('lanza un error legible en el registro del módulo si el valor no es soportado', () => {
    expect(() => timestampProviderFactory.useFactory(fakeConfig('valor-invalido'), otsInstance, freeTsaInstance)).toThrow(
      /TIMESTAMP_PROVIDER="valor-invalido" no es válido/,
    );
  });
});
