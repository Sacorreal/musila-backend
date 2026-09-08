import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecretCipherService } from './secret-cipher.service';

describe('SecretCipherService', () => {
  const VALID_KEY = 'a'.repeat(64); // 32 bytes en hex

  const buildConfig = (value: string | undefined): ConfigService =>
    ({ get: jest.fn().mockReturnValue(value) }) as unknown as ConfigService;

  it('lanza si MFA_ENCRYPTION_KEY no está configurada', () => {
    expect(() => new SecretCipherService(buildConfig(undefined))).toThrow(
      InternalServerErrorException,
    );
  });

  it('lanza si la clave no tiene 32 bytes en hex', () => {
    expect(() => new SecretCipherService(buildConfig('deadbeef'))).toThrow(
      InternalServerErrorException,
    );
  });

  it('encrypt/decrypt hacen roundtrip del texto plano', () => {
    const service = new SecretCipherService(buildConfig(VALID_KEY));

    const serialized = service.encrypt('mi-secreto-totp');

    expect(serialized).not.toContain('mi-secreto-totp');
    expect(service.decrypt(serialized)).toBe('mi-secreto-totp');
  });

  it('decrypt lanza InternalServerErrorException si el formato es inválido', () => {
    const service = new SecretCipherService(buildConfig(VALID_KEY));

    expect(() => service.decrypt('no-es-un-secreto-valido')).toThrow(
      InternalServerErrorException,
    );
  });

  it('decrypt lanza si se usa una clave distinta a la que cifró', () => {
    const cipherA = new SecretCipherService(buildConfig(VALID_KEY));
    const cipherB = new SecretCipherService(buildConfig('b'.repeat(64)));

    const serialized = cipherA.encrypt('mi-secreto-totp');

    expect(() => cipherB.decrypt(serialized)).toThrow(InternalServerErrorException);
  });
});
