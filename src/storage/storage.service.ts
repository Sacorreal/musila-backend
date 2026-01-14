import {
  PutObjectCommand,
  PutObjectCommandOutput,
  S3Client,
} from '@aws-sdk/client-s3';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ACL } from './constants/acl.constants';
import { STORAGE_OPTIONS } from './constants/storage-options.constants';
import { PutObjectDto } from './dto/put-object.dto';
import { UploadResultDto } from './dto/upload-result.dto';
import type { StorageOptions } from './interface/storage-options.interface';


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

  async uploadObject(putObjectDto: PutObjectDto, file: Express.Multer.File): Promise<UploadResultDto> {
    try {
      if (!file || !file.mimetype || !file.originalname || !file.buffer) {
        throw new BadRequestException('Archivo inválido');
      }

      const { key } = putObjectDto;
      const mimetype: string = file.mimetype
      const originalname: string = file.originalname
      const buffer: Buffer = file.buffer

      let folder: string = 'others';
      if (mimetype.startsWith('image/')) folder = 'images'
      if (mimetype.startsWith('audio/')) folder = 'audios'


      const envMap: Record<string, string> = {
        local: 'develop',
        development: 'develop',
        production: 'production',
      };

      const stage = envMap[this.options.environment] ?? 'develop';

      const bucketParams = {
        Bucket: this.options.bucket,
        Key: `${stage}/${folder}/${key}`,
        Body: buffer,
        ContentType: mimetype,
        ACL: ACL.PUBLIC_READ,
      };

      const result: PutObjectCommandOutput = await this.s3.send(
        new PutObjectCommand(bucketParams),
      );

      const rawResponse = {
        success: true,
        url: `https://${this.options.bucket}.${this.options.endpoint}/${stage}/${folder}/${key}`,
        filename: originalname,
        mimetype,
        result: JSON.stringify(result),
        year: new Date().getFullYear(),
      };

      const response = plainToInstance(UploadResultDto, rawResponse);
      const errors = validateSync(response);

      if (errors.length > 0) {
        throw new BadRequestException(errors);
      }

      return response;
    } catch (error) {
      throw new BadRequestException(error?.message || 'Error uploading file');
    }
  }
}
