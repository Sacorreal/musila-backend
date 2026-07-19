import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { TrackLegalProofListener } from './track-legal-proof.listener';
import { LegalEntityType } from 'src/shared/legal-proof/entities/legal-entity-type.enum';

describe('TrackLegalProofListener', () => {
  let listener: TrackLegalProofListener;
  let storageService: { downloadObjectToTempFile: jest.Mock };
  let legalProofService: { generateProof: jest.Mock };
  let tempFilePath: string;

  beforeEach(async () => {
    tempFilePath = path.join(os.tmpdir(), `listener-test-${randomUUID()}.txt`);
    await fs.writeFile(tempFilePath, 'contenido de prueba, no es un audio real');

    storageService = {
      downloadObjectToTempFile: jest.fn().mockResolvedValue({
        filePath: tempFilePath,
        contentType: 'audio/mpeg',
        contentLength: 123,
      }),
    };
    legalProofService = {
      generateProof: jest.fn().mockResolvedValue({}),
    };

    listener = new TrackLegalProofListener(storageService as any, legalProofService as any);
  });

  afterEach(async () => {
    await fs.rm(tempFilePath, { force: true });
  });

  it('genera la evidencia con el shape correcto y borra el archivo temporal', async () => {
    jest.spyOn(listener as any, 'extractAudioMetadata').mockResolvedValue({
      durationSeconds: 180,
      format: 'MPEG',
      bitRate: 128000,
      sampleRate: 44100,
      channels: 2,
      codec: 'MPEG 1 Layer 3',
    });

    await listener.handleTrackCreated({
      trackId: 'track-1',
      audioKey: 'develop/tracks/audio/cancion.mp3',
      requestedByUserId: 'user-1',
    });

    expect(storageService.downloadObjectToTempFile).toHaveBeenCalledWith(
      'develop/tracks/audio/cancion.mp3',
    );
    expect(legalProofService.generateProof).toHaveBeenCalledWith({
      file: {
        buffer: expect.any(Buffer),
        fileName: 'cancion.mp3',
        mimeType: 'audio/mpeg',
      },
      metadataPayload: {
        size: 123,
        mimeType: 'audio/mpeg',
        fileName: 'cancion.mp3',
        durationSeconds: 180,
        format: 'MPEG',
        bitRate: 128000,
        sampleRate: 44100,
        channels: 2,
        codec: 'MPEG 1 Layer 3',
      },
      context: {
        entityType: LegalEntityType.TRACK,
        entityId: 'track-1',
        requestedByUserId: 'user-1',
        sourceFileKey: 'develop/tracks/audio/cancion.mp3',
      },
    });

    await expect(fs.access(tempFilePath)).rejects.toThrow();
  });

  it('no propaga el error si generateProof rechaza, y de todas formas borra el archivo temporal', async () => {
    jest.spyOn(listener as any, 'extractAudioMetadata').mockResolvedValue({});
    legalProofService.generateProof.mockRejectedValue(new Error('boom'));

    await expect(
      listener.handleTrackCreated({ trackId: 'track-2', audioKey: 'k.mp3' }),
    ).resolves.toBeUndefined();

    await expect(fs.access(tempFilePath)).rejects.toThrow();
  });

  it('no propaga el error si downloadObjectToTempFile rechaza', async () => {
    storageService.downloadObjectToTempFile.mockRejectedValue(new Error('S3 down'));

    await expect(
      listener.handleTrackCreated({ trackId: 'track-3', audioKey: 'k.mp3' }),
    ).resolves.toBeUndefined();

    expect(legalProofService.generateProof).not.toHaveBeenCalled();
  });

  it('extractAudioMetadata retorna un objeto vacío si el archivo no se puede parsear como audio', async () => {
    const result = await (listener as any).extractAudioMetadata(tempFilePath);

    expect(result).toEqual({});
  });
});
