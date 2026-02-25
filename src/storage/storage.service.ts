import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';

import { STORAGE_OPTIONS } from './constants/storage-options.constants';
import { ACL } from './constants/acl.constants';
import type { StorageOptions } from './interface/storage-options.interface';
import { StorageFolder } from './dto/storage-folder.enum';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;

  constructor(
    @Inject(STORAGE_OPTIONS)
    private readonly options: StorageOptions,
  ) {
    this.s3 = new S3Client({
      endpoint: `https://${this.options.endpoint}`,
      region: this.options.region,
      credentials: {
        accessKeyId: this.options.accessKeyId,
        secretAccessKey: this.options.secretAccessKey,
      },
    });
  }

  // =====================================================
  // ✅ GENERATE PRESIGNED UPLOAD URL
  // =====================================================

  async generateUploadUrl(params: {
    folder: StorageFolder;
    fileType: string;
  }) {
    this.validateMimeType(params.fileType);

    const extension = this.extractExtension(params.fileType);

    const stage = this.resolveStage();

    const key = `${stage}/${params.folder}/${uuid()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.options.bucket,
      Key: key,
      ContentType: params.fileType,
      ACL: ACL.PUBLIC_READ,
    });

    try {
      const uploadUrl = await getSignedUrl(this.s3, command, {
        expiresIn: 60,
      });

      return {
        uploadUrl,
        key,
        publicUrl: this.buildPublicUrl(key),
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Error generating upload URL',
      );
    }
  }

  // =====================================================
  // ✅ DELETE FILE (REPLACE / UPDATE)
  // =====================================================

  async deleteObject(key: string): Promise<void> {
    if (!key) return;

    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.options.bucket,
          Key: key,
        }),
      );
    } catch (error) {
      console.error('Storage delete error:', error);
    }
  }

  // =====================================================
  // ✅ CHECK FILE EXISTS
  // =====================================================

  async fileExists(key: string): Promise<boolean> {
    try {
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.options.bucket,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  // =====================================================
  // ✅ HELPERS
  // =====================================================

  buildPublicUrl(key: string): string {
    return `https://${this.options.bucket}.${this.options.endpoint}/${key}`;
  }

  private resolveStage(): string {
    const envMap: Record<string, string> = {
      local: 'develop',
      development: 'develop',
      production: 'production',
    };

    return envMap[this.options.environment] ?? 'develop';
  }

  private validateMimeType(fileType: string) {
    if (!fileType.includes('/')) {
      throw new BadRequestException('Invalid MIME type');
    }
  
    const allowedMimeTypes = [
      // AUDIO
      'audio/mpeg',
      'audio/wav',
      'audio/mp3',
      'audio/x-wav',
  
      // IMAGES
      'image/jpeg',
      'image/png',
      'image/webp',
  
      // DOCUMENTS
      'application/pdf',
      'application/x-pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
  
    if (!allowedMimeTypes.includes(fileType)) {
      throw new BadRequestException(
        `Unsupported file type: ${fileType}`,
      );
    }
  }

  private extractExtension(fileType: string): string {
    const mimeMap: Record<string, string> = {
      // AUDIO
      'audio/mpeg': 'mp3',
      'audio/mp3': 'mp3',
      'audio/wav': 'wav',
      'audio/x-wav': 'wav',
  
      // IMAGES
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
  
      // DOCUMENTS
      'application/pdf': 'pdf',
      'application/x-pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        'docx',
    };
  
    return mimeMap[fileType] || fileType.split('/')[1];
  }

 
}