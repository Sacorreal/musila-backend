import { createHash } from 'crypto';
import { FileHashService } from './file-hash.service';

describe('FileHashService', () => {
  let service: FileHashService;

  beforeEach(() => {
    service = new FileHashService();
  });

  it('calcula el mismo hash SHA-256 que crypto directamente', () => {
    const buffer = Buffer.from('contenido de prueba para hashear');
    const expected = createHash('sha256').update(buffer).digest('hex');

    expect(service.computeSha256(buffer)).toBe(expected);
  });

  it('devuelve un hash hexadecimal de 64 caracteres', () => {
    const result = service.computeSha256(Buffer.from('x'));

    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produce hashes distintos para contenidos distintos', () => {
    const hashA = service.computeSha256(Buffer.from('a'));
    const hashB = service.computeSha256(Buffer.from('b'));

    expect(hashA).not.toBe(hashB);
  });
});
