import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import { FileUpload, WriteStream } from 'graphql-upload-ts';
import path from 'path';
import { Readable } from 'stream';
import { PutObjectDto } from './dto/put-object.dto';
import { StorageService } from './storage.service';

// ✅ Mock de @aws-sdk/client-s3 dentro del mismo archivo
jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn(),
    })),
    PutObjectCommand: jest.fn().mockImplementation((params) => params),
  };
});

import { S3Client } from '@aws-sdk/client-s3';

describe('StorageService - uploadObject', () => {
  let service: StorageService;
  let s3ClientMock: jest.Mocked<S3Client>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: 'STORAGE_OPTIONS',
          useValue: {
            region: 'nyc3',
            bucket: 'test-bucket',
            endpoint: 'nyc3.digitaloceanspaces.com',
            enviroment: 'local',
            key: 'fake-key',
            secret: 'fake-secret',
            cdn: 'https://cdn.test-bucket.com',
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    s3ClientMock = (service as any).s3 as jest.Mocked<S3Client>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('✅ should upload an image and return UploadResultDto with stringified result', async () => {
    const fakeFile: FileUpload = {
      filename: 'test.png',
      mimetype: 'image/png',
      encoding: '7bit',
      fieldName: 'file',
      capacitor: fs.createWriteStream(
        path.join(__dirname, 'tmp.txt'),
      ) as unknown as WriteStream,
      createReadStream: () => Readable.from(['fake content']) as any,
    };

    const putObjectDto: PutObjectDto = {
      file: Promise.resolve(fakeFile),
      key: 'test.png',
    };

    // Mock de la respuesta de S3
    (s3ClientMock.send as jest.Mock).mockResolvedValueOnce({
      ETag: '"12345"',
      $metadata: { httpStatusCode: 200 },
    });

    const result = await service.uploadObject(putObjectDto);

    // 🔎 Validaciones principales
    expect(result.success).toBe(true);
    expect(result.url).toContain(
      'https://test-bucket.nyc3.digitaloceanspaces.com/develop/images/test.png',
    );
    expect(result.filename).toBe('test.png');
    expect(result.mimetype).toBe('image/png');
    expect(result.year).toBe(new Date().getFullYear());

    // 🔎 Parseamos el string `result` para validar los campos del S3
    const parsed = JSON.parse(result.result);
    expect(parsed.ETag).toBe('"12345"');
    expect(parsed.$metadata.httpStatusCode).toBe(200);
  });

  it('❌ should throw BadRequestException on error', async () => {
    const fakeFile: FileUpload = {
      filename: 'test.png',
      mimetype: 'image/png',
      encoding: '7bit',
      fieldName: 'file',
      capacitor: fs.createWriteStream(
        path.join(__dirname, 'tmp.txt'),
      ) as unknown as WriteStream,
      createReadStream: () => Readable.from(['fake content']) as any,
    };

    const putObjectDto: PutObjectDto = {
      file: Promise.resolve(fakeFile),
      key: 'test.png',
    };

    // Simulamos error en la subida
    (s3ClientMock.send as jest.Mock).mockRejectedValueOnce(
      new Error('Upload failed'),
    );

    await expect(service.uploadObject(putObjectDto)).rejects.toThrow(
      BadRequestException,
    );
  });
});
