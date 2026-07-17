import { Injectable } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import { mkdtemp, unlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { extname, join } from 'path';
import { withTimeout } from 'src/shared/utils/with-timeout.util';
import { LEGAL_PROOF_TIMEOUTS } from '../constants/legal-proof.constants';
import { ExtractedFileMetadata } from '../interfaces/file-metadata.interface';
import { LegalProofFileInput } from '../interfaces/legal-proof-input.interface';
import './ffmpeg-binaries.bootstrap';

@Injectable()
export class FileMetadataService {
  async extract(file: LegalProofFileInput): Promise<ExtractedFileMetadata> {
    const isAudioOrVideo = /^(audio|video)\//.test(file.mimeType);

    if (!isAudioOrVideo) {
      return { size: file.buffer.length, mimeType: file.mimeType, fileName: file.fileName };
    }

    return this.extractWithFfprobe(file);
  }

  private async extractWithFfprobe(file: LegalProofFileInput): Promise<ExtractedFileMetadata> {
    const tempFilePath = await this.writeTempFile(file);

    try {
      const raw = await withTimeout(
        this.runFfprobe(tempFilePath),
        LEGAL_PROOF_TIMEOUTS.FFPROBE_MS,
        'ffprobe timeout',
      );
      const streamType = file.mimeType.startsWith('video') ? 'video' : 'audio';
      const stream = raw.streams?.find((s) => s.codec_type === streamType);

      return {
        size: file.buffer.length,
        mimeType: file.mimeType,
        fileName: file.fileName,
        durationSeconds: raw.format?.duration !== undefined ? Number(raw.format.duration) : undefined,
        format: raw.format?.format_name,
        bitRate: raw.format?.bit_rate !== undefined ? Number(raw.format.bit_rate) : undefined,
        sampleRate: stream?.sample_rate !== undefined ? Number(stream.sample_rate) : undefined,
        channels: stream?.channels,
        codec: stream?.codec_name,
        raw: raw as unknown as Record<string, any>,
      };
    } catch (error) {
      throw new Error(`ffprobe failed to read metadata for "${file.fileName}": ${(error as Error).message}`);
    } finally {
      await unlink(tempFilePath).catch(() => undefined);
    }
  }

  private runFfprobe(path: string): Promise<ffmpeg.FfprobeData> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(path, (err, data) =>
        err ? reject(err instanceof Error ? err : new Error(String(err))) : resolve(data),
      );
    });
  }

  private async writeTempFile(file: LegalProofFileInput): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'legal-proof-'));
    const ext = extname(file.fileName) || '';
    const path = join(dir, `source${ext}`);
    await writeFile(path, file.buffer);
    return path;
  }
}
