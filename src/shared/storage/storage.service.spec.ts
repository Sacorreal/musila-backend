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
    endpoint: 'https://nyc3.digitaloceanspaces.com',
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

    it('debería generar una URL de carga correctamente para un archivo .m4a (audio/mp4)', async () => {
      const params = {
        folder: StorageFolder.TRACK_AUDIO,
        fileType: 'audio/mp4',
      };

      const result = await service.generateUploadUrl(params);

      expect(result.key).toMatch(/\.m4a$/);
    });

    it('debería generar una URL de carga correctamente para un archivo .m4a (audio/x-m4a)', async () => {
      const params = {
        folder: StorageFolder.TRACK_AUDIO,
        fileType: 'audio/x-m4a',
      };

      const result = await service.generateUploadUrl(params);

      expect(result.key).toMatch(/\.m4a$/);
    });

    it('debería generar una URL de carga correctamente para un archivo .3gp (audio/3gpp)', async () => {
      const params = {
        folder: StorageFolder.TRACK_AUDIO,
        fileType: 'audio/3gpp',
      };

      const result = await service.generateUploadUrl(params);

      expect(result.key).toMatch(/\.3gp$/);
    });

    it('debería generar una URL de carga correctamente para un archivo .3gp reportado como video/3gpp (Android)', async () => {
      const params = {
        folder: StorageFolder.TRACK_AUDIO,
        fileType: 'video/3gpp',
      };

      const result = await service.generateUploadUrl(params);

      expect(result.key).toMatch(/\.3gp$/);
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

  describe('uploadBuffer', () => {
    it('debería subir el buffer y devolver la key con el prefijo de stage y la publicUrl', async () => {
      const s3SendMock = jest.spyOn(S3Client.prototype, 'send').mockImplementation(() => Promise.resolve({})) as any;

      const result = await service.uploadBuffer({
        key: 'legal-proofs/track/abc/hash.ots',
        buffer: Buffer.from('contenido-de-prueba'),
        contentType: 'application/octet-stream',
      });

      expect(s3SendMock).toHaveBeenCalled();
      expect(result.key).toBe('develop/legal-proofs/track/abc/hash.ots');
      expect(result.publicUrl).toBe(
        'https://mi-bucket-test.nyc3.digitaloceanspaces.com/develop/legal-proofs/track/abc/hash.ots',
      );
    });

    it('debería lanzar InternalServerErrorException si S3 falla', async () => {
      jest.spyOn(S3Client.prototype, 'send').mockImplementation(() => Promise.reject(new Error('S3 down')));

      await expect(
        service.uploadBuffer({
          key: 'legal-proofs/track/abc/hash.ots',
          buffer: Buffer.from('x'),
          contentType: 'application/octet-stream',
        }),
      ).rejects.toThrow('Error uploading file to storage');
    });
  });

  describe('downloadObject', () => {
    it('debería descargar y reconstruir el buffer a partir del stream de S3', async () => {
      function* fakeBody() {
        yield Buffer.from('hola ');
        yield Buffer.from('mundo');
      }

      jest.spyOn(S3Client.prototype, 'send').mockImplementation(() =>
        Promise.resolve({ Body: fakeBody() } as any),
      );

      const result = await service.downloadObject('some-key');

      expect(result.toString()).toBe('hola mundo');
    });

    it('debería lanzar InternalServerErrorException si S3 falla', async () => {
      jest.spyOn(S3Client.prototype, 'send').mockImplementation(() => Promise.reject(new Error('S3 down')));

      await expect(service.downloadObject('some-key')).rejects.toThrow(
        'Error downloading file from storage',
      );
    });
  });

  describe('downloadObjectToTempFile', () => {
    let tempFilePathUsed: string | undefined;

    afterEach(async () => {
      if (!tempFilePathUsed) return;
      const fs = await import('fs/promises');
      await fs.rm(tempFilePathUsed, { force: true }).catch(() => undefined);
      tempFilePathUsed = undefined;
    });

    it('debería escribir el archivo a disco y devolver contentType/contentLength', async () => {
      function* fakeBody() {
        yield Buffer.from('hola ');
        yield Buffer.from('mundo');
      }

      jest.spyOn(S3Client.prototype, 'send').mockImplementation(() =>
        Promise.resolve({
          Body: fakeBody(),
          ContentType: 'audio/mpeg',
          ContentLength: 10,
        } as any),
      );

      const result = await service.downloadObjectToTempFile('tracks/audio/file.mp3');
      tempFilePathUsed = result.filePath;

      const fs = await import('fs/promises');
      const written = await fs.readFile(result.filePath, 'utf-8');

      expect(written).toBe('hola mundo');
      expect(result.contentType).toBe('audio/mpeg');
      expect(result.contentLength).toBe(10);
      expect(result.filePath).toContain('file.mp3');
    });

    it('debería lanzar InternalServerErrorException si S3 falla', async () => {
      jest.spyOn(S3Client.prototype, 'send').mockImplementation(() => Promise.reject(new Error('S3 down')));

      await expect(service.downloadObjectToTempFile('some-key')).rejects.toThrow(
        'Error downloading file to temp file',
      );
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