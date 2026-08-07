/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import type { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { randomUUID } from 'crypto';
import * as os from 'os';
import * as path from 'path';

import { STORAGE_OPTIONS } from './constants/storage-options.constants';
import { ACL } from './constants/acl.constants';
import type { StorageOptions } from './interface/storage-options.interface';
import { StorageFolder } from './dto/storage-folder.enum';


@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3: S3Client;

  constructor(
    @Inject(STORAGE_OPTIONS)
    private readonly options: StorageOptions,
  ) {
    this.s3 = new S3Client({
      endpoint: this.options.endpoint,
      region: this.options.region,
      credentials: {
        accessKeyId: this.options.accessKeyId,
        secretAccessKey: this.options.secretAccessKey,
      },
      forcePathStyle:false,
      requestChecksumCalculation: "WHEN_REQUIRED",     
      responseChecksumValidation: "WHEN_REQUIRED"
    });
  }

  // =====================================================
  // ✅ GENERATE PRESIGNED UPLOAD URL
  // =====================================================

  async generateUploadUrl(params: {
    folder: string;
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
        expiresIn: 900,
        signableHeaders: new Set(['host', 'content-type', 'x-amz-acl']),
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
  // ✅ UPLOAD BUFFER (subida server-side, sin presigned URL)
  // =====================================================

  async uploadBuffer(params: {
    key: string;
    buffer: Buffer;
    contentType: string;
  }): Promise<{ key: string; publicUrl: string }> {
    const stage = this.resolveStage();
    const fullKey = `${stage}/${params.key}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.options.bucket,
          Key: fullKey,
          Body: params.buffer,
          ContentType: params.contentType,
          ACL: ACL.PUBLIC_READ,
        }),
      );

      return {
        key: fullKey,
        publicUrl: this.buildPublicUrl(fullKey),
      };
    } catch (error) {
      this.logger.error('Error al subir archivo al storage:', error);
      throw new InternalServerErrorException('Error uploading file to storage');
    }
  }

  // =====================================================
  // ✅ DOWNLOAD OBJECT (lectura server-side)
  // =====================================================

  async downloadObject(key: string): Promise<Buffer> {
    try {
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.options.bucket,
          Key: key,
        }),
      );

      const stream = response.Body as Readable;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error('Error al descargar archivo del storage:', error);
      throw new InternalServerErrorException('Error downloading file from storage');
    }
  }

  // =====================================================
  // ✅ DOWNLOAD OBJECT TO TEMP FILE (lectura server-side a disco)
  // =====================================================

  async downloadObjectToTempFile(
    key: string,
  ): Promise<{ filePath: string; contentType: string; contentLength: number }> {
    try {
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.options.bucket,
          Key: key,
        }),
      );

      const filePath = path.join(
        os.tmpdir(),
        `legal-proof-${randomUUID()}-${path.basename(key)}`,
      );

      await pipeline(response.Body as Readable, createWriteStream(filePath));

      return {
        filePath,
        contentType: response.ContentType ?? 'application/octet-stream',
        contentLength: response.ContentLength ?? 0,
      };
    } catch (error) {
      this.logger.error('Error al descargar archivo a un archivo temporal:', error);
      throw new InternalServerErrorException('Error downloading file to temp file');
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
      this.logger.error('Error al eliminar archivo del storage:', error);
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
    return `https://${this.options.bucket}.${this.options.region}.digitaloceanspaces.com/${key}`;
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
      'audio/mp4', // .m4a (tipo IANA)
      'audio/x-m4a', // .m4a (alias Apple, muy común)
      'audio/m4a', // .m4a (variante rara, red de seguridad)
      'audio/3gpp', // .3gp (tipo IANA para audio-only)
      'video/3gpp', // .3gp (lo que realmente reporta Android para .3gp de audio)

      // IMAGES
      'image/jpeg',
      'image/png',
      'image/webp',
  
      // DOCUMENTS
      'application/pdf',
      'application/x-pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

      // ZIP (paquete generado del Expediente de Registro)
      'application/zip',
      'application/x-zip-compressed',
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
      'audio/mp4': 'm4a',
      'audio/x-m4a': 'm4a',
      'audio/m4a': 'm4a',
      'audio/3gpp': '3gp',
      'video/3gpp': '3gp',

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

      // ZIP
      'application/zip': 'zip',
      'application/x-zip-compressed': 'zip',
    };
  
    return mimeMap[fileType] || fileType.split('/')[1];
  }

 
}