import { Injectable } from '@nestjs/common';
import { ExtractedFileMetadata, FileMetadataPayload } from '../interfaces/file-metadata.interface';

@Injectable()
export class FileMetadataService {
  extract(payload: FileMetadataPayload): ExtractedFileMetadata {
    const isAudioOrVideo = /^(audio|video)\//.test(payload.mimeType);

    if (!isAudioOrVideo) {
      return { size: payload.size, mimeType: payload.mimeType, fileName: payload.fileName };
    }

    return {
      size: payload.size,
      mimeType: payload.mimeType,
      fileName: payload.fileName,
      durationSeconds: payload.durationSeconds,
      format: payload.format,
      bitRate: payload.bitRate,
      sampleRate: payload.sampleRate,
      channels: payload.channels,
      codec: payload.codec,
    };
  }
}
