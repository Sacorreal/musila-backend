import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { StorageService } from './storage.service';
import { STORAGE_OPTIONS } from './constants/storage-options.constants';
import { StorageFolder } from './dto/storage-folder.enum';

describe('StorageService', () => {
  let service: StorageService;

  // 1. Mock de las opciones de configuración inyectadas
  const mockStorageOptions = {
    endpoint: 'nyc3.digitaloceanspaces.com',
    region: 'nyc3',
    accessKeyId: 'fake-access-key',
    secretAccessKey: 'fake-secret-key',
    bucket: 'mi-bucket-test',
    environment: 'development',
  };

  beforeEach(async () => {
    // Restaurar mocks antes de cada test para no contaminar
    jest.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: STORAGE_OPTIONS,
          useValue: mockStorageOptions,
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  it('debería estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('generateUploadUrl', () => {
    it('debería generar una URL de carga correctamente', async () => {
      // Arrange
      const params = {
        folder: StorageFolder.TRACK_AUDIO,
        fileType: 'audio/mpeg',
      };

      // Act
      const result = await service.generateUploadUrl(params);

      // Assert
      expect(result.uploadUrl).toBeDefined();
      expect(result.key).toContain('develop/tracks/audio/');
      expect(result.publicUrl).toContain('https://mi-bucket-test.nyc3.digitaloceanspaces.com/');
    });

    it('debería lanzar BadRequestException para tipos de archivo no soportados', async () => {
      // Arrange
      const params = {
        folder: StorageFolder.TRACK_AUDIO,
        fileType: 'application/exe', // No permitido
      };

      // Act & Assert
      await expect(service.generateUploadUrl(params)).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteObject', () => {
    it('debería intentar eliminar un objeto sin errores', async () => {
      const s3SendMock = jest.spyOn(S3Client.prototype, 'send').mockImplementation(() => Promise.resolve({})) as any;
      
      await service.deleteObject('some-key');

      expect(s3SendMock).toHaveBeenCalled();
    });
  });

  describe('fileExists', () => {
    it('debería retornar true si el archivo existe', async () => {
      jest.spyOn(S3Client.prototype, 'send').mockImplementation(() => Promise.resolve({}));
      const result = await service.fileExists('some-key');
      expect(result).toBe(true);
    });

    it('debería retornar false si el archivo no existe', async () => {
      jest.spyOn(S3Client.prototype, 'send').mockImplementation(() => Promise.reject(new Error('NotFound')));
      const result = await service.fileExists('some-key');
      expect(result).toBe(false);
    });
  });
});