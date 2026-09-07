import { UnprocessableEntityException } from '@nestjs/common';
import { LegalProofService } from './legal-proof.service';
import { LegalProof } from './entities/legal-proof.entity';
import { LegalProofStatus } from './entities/legal-proof-status.enum';
import { LegalEntityType } from './entities/legal-entity-type.enum';
import { GenerateLegalProofInput } from './interfaces/legal-proof-input.interface';

describe('LegalProofService', () => {
  let service: LegalProofService;
  let repo: { create: jest.Mock; save: jest.Mock };
  let fileMetadataService: { extract: jest.Mock };
  let fileHashService: { computeSha256: jest.Mock };
  let timestampService: { createTimestamp: jest.Mock };
  let storageService: { uploadBuffer: jest.Mock };
  let eventBus: { emit: jest.Mock };

  const baseInput: GenerateLegalProofInput = {
    file: {
      buffer: Buffer.from('contenido de prueba'),
      fileName: 'track.mp3',
      mimeType: 'audio/mpeg',
    },
    metadataPayload: {
      size: 20,
      mimeType: 'audio/mpeg',
      fileName: 'track.mp3',
      durationSeconds: 123.45,
    },
    context: {
      entityType: LegalEntityType.TRACK,
      entityId: 'entity-id-1',
    },
  };

  beforeEach(() => {
    repo = {
      create: jest.fn((data: Partial<LegalProof>) => data as LegalProof),
      save: jest.fn((data: LegalProof) => Promise.resolve({ ...data, id: 'legal-proof-id-1' })),
    };
    fileMetadataService = { extract: jest.fn().mockReturnValue({ size: 20, mimeType: 'audio/mpeg', fileName: 'track.mp3' }) };
    fileHashService = { computeSha256: jest.fn().mockResolvedValue('a'.repeat(64)) };
    timestampService = {
      createTimestamp: jest.fn().mockResolvedValue({ provider: 'opentimestamps', evidence: Buffer.from('ots') }),
    };
    storageService = {
      uploadBuffer: jest.fn().mockResolvedValue({ key: 'develop/legal-proofs/track/entity-id-1/hash.ots', publicUrl: 'https://x/y' }),
    };
    eventBus = { emit: jest.fn() };

    service = new LegalProofService(
      repo as any,
      fileMetadataService as any,
      fileHashService as any,
      timestampService as any,
      storageService as any,
      eventBus as any,
    );
  });

  it('happy path: genera metadata, hash y .ots, persiste PENDING y emite legal-proof.generated', async () => {
    const result = await service.generateProof(baseInput);

    expect(fileMetadataService.extract).toHaveBeenCalledWith(baseInput.metadataPayload);
    expect(fileHashService.computeSha256).toHaveBeenCalledWith(baseInput.file.buffer);
    expect(timestampService.createTimestamp).toHaveBeenCalledWith(Buffer.from('a'.repeat(64), 'hex'));
    expect(storageService.uploadBuffer).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'legal-proofs/track/entity-id-1/' + 'a'.repeat(64) + '.ots' }),
    );
    expect(repo.save).toHaveBeenCalled();

    expect(result.legalProofId).toBe('legal-proof-id-1');
    expect(result.sha256Hash).toBe('a'.repeat(64));
    expect(result.otsStatus).toBe(LegalProofStatus.PENDING);
    expect(result.otsKey).toBe('develop/legal-proofs/track/entity-id-1/hash.ots');
    expect(result.errors).toEqual([]);

    expect(eventBus.emit).toHaveBeenCalledWith(
      'legal-proof.generated',
      expect.objectContaining({ legalProofId: 'legal-proof-id-1', status: LegalProofStatus.PENDING }),
    );
  });

  it('aborta con UnprocessableEntityException y emite legal-proof.failed si la extracción de metadata falla', async () => {
    fileMetadataService.extract.mockImplementation(() => {
      throw new Error('metadata payload inválido');
    });

    await expect(service.generateProof(baseInput)).rejects.toThrow(UnprocessableEntityException);

    expect(repo.save).not.toHaveBeenCalled();
    expect(timestampService.createTimestamp).not.toHaveBeenCalled();
    expect(eventBus.emit).toHaveBeenCalledWith(
      'legal-proof.failed',
      expect.objectContaining({ entityType: 'track', entityId: 'entity-id-1', reason: 'metadata payload inválido' }),
    );
  });

  it('si el timestamp falla tras los reintentos, persiste status FAILED sin lanzar excepción', async () => {
    timestampService.createTimestamp.mockRejectedValue(new Error('calendar servers unreachable'));

    const result = await service.generateProof(baseInput);

    expect(storageService.uploadBuffer).not.toHaveBeenCalled();
    expect(result.otsStatus).toBe(LegalProofStatus.FAILED);
    expect(result.otsKey).toBeNull();
    expect(result.errors).toEqual([
      expect.objectContaining({ step: 'timestamp', message: 'calendar servers unreachable' }),
    ]);
    expect(repo.save).toHaveBeenCalled();
    expect(eventBus.emit).toHaveBeenCalledWith(
      'legal-proof.generated',
      expect.objectContaining({ status: LegalProofStatus.FAILED, otsKey: null }),
    );
  });
});
