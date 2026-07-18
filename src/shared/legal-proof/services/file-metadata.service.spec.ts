import { FileMetadataService } from './file-metadata.service';
import { FileMetadataPayload } from '../interfaces/file-metadata.interface';

describe('FileMetadataService', () => {
  let service: FileMetadataService;

  beforeEach(() => {
    service = new FileMetadataService();
  });

  it('para un mimeType no audio/video, devuelve solo la metadata básica del payload', () => {
    const payload: FileMetadataPayload = {
      size: 29,
      mimeType: 'application/pdf',
      fileName: 'contrato.pdf',
      durationSeconds: 999,
    };

    const result = service.extract(payload);

    expect(result).toEqual({
      size: 29,
      mimeType: 'application/pdf',
      fileName: 'contrato.pdf',
    });
  });

  it('para un archivo de audio, conserva la metadata enriquecida del payload', () => {
    const payload: FileMetadataPayload = {
      size: 4_200_000,
      mimeType: 'audio/mpeg',
      fileName: 'cancion.mp3',
      durationSeconds: 123.45,
      format: 'mp3',
      bitRate: 320000,
      sampleRate: 44100,
      channels: 2,
      codec: 'mp3',
    };

    const result = service.extract(payload);

    expect(result).toEqual(payload);
  });

  it('para un archivo de video, conserva la metadata enriquecida del payload', () => {
    const payload: FileMetadataPayload = {
      size: 10_000_000,
      mimeType: 'video/mp4',
      fileName: 'clip.mp4',
      durationSeconds: 60,
      format: 'mp4',
      bitRate: 1_200_000,
    };

    const result = service.extract(payload);

    expect(result).toEqual(payload);
  });
});
