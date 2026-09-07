import { createHash } from 'crypto';
import { FileHashService } from './file-hash.service';

describe('FileHashService', () => {
  let service: FileHashService;

  beforeEach(() => {
    service = new FileHashService({ get: jest.fn().mockReturnValue(2) } as any);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('calcula el mismo hash SHA-256 que crypto directamente', async () => {
    const buffer = Buffer.from('contenido de prueba para hashear');
    const expected = createHash('sha256').update(buffer).digest('hex');

    await expect(service.computeSha256(buffer)).resolves.toBe(expected);
  });

  it('devuelve un hash hexadecimal de 64 caracteres', async () => {
    const result = await service.computeSha256(Buffer.from('x'));

    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produce hashes distintos para contenidos distintos', async () => {
    const [hashA, hashB] = await Promise.all([
      service.computeSha256(Buffer.from('a')),
      service.computeSha256(Buffer.from('b')),
    ]);

    expect(hashA).not.toBe(hashB);
  });

  it('calcula correctamente el hash de un buffer grande (varios MB)', async () => {
    const buffer = Buffer.alloc(5 * 1024 * 1024, 'x');
    const expected = createHash('sha256').update(buffer).digest('hex');

    await expect(service.computeSha256(buffer)).resolves.toBe(expected);
  });
});
