jest.mock('@ffmpeg-installer/ffmpeg', () => ({ path: '/fake/ffmpeg' }), { virtual: true });
jest.mock('@ffprobe-installer/ffprobe', () => ({ path: '/fake/ffprobe' }), { virtual: true });

const ffprobeMock = jest.fn();
const setFfmpegPathMock = jest.fn();
const setFfprobePathMock = jest.fn();

jest.mock('fluent-ffmpeg', () => ({
  __esModule: true,
  default: {
    ffprobe: (...args: unknown[]) => {
      ffprobeMock(...args);
    },
    setFfmpegPath: (...args: unknown[]) => {
      setFfmpegPathMock(...args);
    },
    setFfprobePath: (...args: unknown[]) => {
      setFfprobePathMock(...args);
    },
  },
}));

import { FileMetadataService } from './file-metadata.service';
import { LegalProofFileInput } from '../interfaces/legal-proof-input.interface';

describe('FileMetadataService', () => {
  let service: FileMetadataService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FileMetadataService();
  });

  it('para un mimeType no audio/video, devuelve metadata básica sin invocar ffprobe', async () => {
    const file: LegalProofFileInput = {
      buffer: Buffer.from('%PDF-1.4 contenido de prueba'),
      fileName: 'contrato.pdf',
      mimeType: 'application/pdf',
    };

    const result = await service.extract(file);

    expect(result).toEqual({
      size: file.buffer.length,
      mimeType: 'application/pdf',
      fileName: 'contrato.pdf',
    });
    expect(ffprobeMock).not.toHaveBeenCalled();
  });

  it('para un archivo de audio, invoca ffprobe y mapea la metadata relevante', async () => {
    ffprobeMock.mockImplementation((_path: string, cb: (err: unknown, data: unknown) => void) => {
      cb(null, {
        format: { duration: '123.45', format_name: 'mp3', bit_rate: '320000' },
        streams: [{ codec_type: 'audio', sample_rate: '44100', channels: 2, codec_name: 'mp3' }],
      });
    });

    const file: LegalProofFileInput = {
      buffer: Buffer.from('fake-mp3-bytes'),
      fileName: 'cancion.mp3',
      mimeType: 'audio/mpeg',
    };

    const result = await service.extract(file);

    expect(ffprobeMock).toHaveBeenCalled();
    expect(result.durationSeconds).toBe(123.45);
    expect(result.format).toBe('mp3');
    expect(result.bitRate).toBe(320000);
    expect(result.sampleRate).toBe(44100);
    expect(result.channels).toBe(2);
    expect(result.codec).toBe('mp3');
    expect(result.size).toBe(file.buffer.length);
  });

  it('aborta con un error descriptivo si ffprobe falla en un archivo de audio', async () => {
    ffprobeMock.mockImplementation((_path: string, cb: (err: unknown, data: unknown) => void) => {
      cb(new Error('formato corrupto'), null);
    });

    const file: LegalProofFileInput = {
      buffer: Buffer.from('bytes-corruptos'),
      fileName: 'roto.mp3',
      mimeType: 'audio/mpeg',
    };

    await expect(service.extract(file)).rejects.toThrow(/roto\.mp3/);
  });
});
