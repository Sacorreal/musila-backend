import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

@Injectable()
export class FileHashService {
  computeSha256(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }
}
