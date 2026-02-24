import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { StorageService } from './storage.service';
import { STORAGE_OPTIONS } from './constants/storage-options.constants';

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

  // 2. Mock del archivo (Multer)
  const mockAudioFile: Express.Multer.File = {
    fieldname: 'audio',
    originalname: 'cancion-test.mp3',
    encoding: '7bit',
    mimetype: 'audio/mpeg',
    size: 1024,
    buffer: Buffer.from('archivo-falso-de-audio'),
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
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

  describe('uploadObject', () => {
    it('debería subir un archivo correctamente y retornar el UploadResultDto', async () => {
      // Arrange (Preparar)
      const putObjectDto = { key: 'track-123' };
      
      // Espiamos y mockeamos la función 'send' de S3Client para que no haga peticiones reales
      const s3SendMock = jest.spyOn(
        S3Client.prototype,
        'send',
      ) as any;

      s3SendMock.mockResolvedValueOnce({
        $metadata: { httpStatusCode: 200 },
      } as any);

      // Act (Ejecutar)
      const result = await service.uploadObject(putObjectDto, mockAudioFile);

      // Assert (Comprobar)
      expect(s3SendMock).toHaveBeenCalledTimes(1);
      
      // Comprobamos que el comando enviado a S3 sea correcto
      const commandArg = s3SendMock.mock.calls[0][0] as PutObjectCommand;
      expect(commandArg.input.Bucket).toBe(mockStorageOptions.bucket);
      expect(commandArg.input.ContentType).toBe(mockAudioFile.mimetype);
      
      // Comprobamos la ruta generada (asumiendo que aplicaste la corrección de extname)
      expect(commandArg.input.Key).toBe('develop/audios/track-123.mp3'); 

      // Comprobamos el resultado retornado por tu servicio
      expect(result.success).toBe(true);
      expect(result.filename).toBe(mockAudioFile.originalname);
      expect(result.mimetype).toBe(mockAudioFile.mimetype);
      expect(result.location).toContain('https://mi-bucket-test.nyc3.digitaloceanspaces.com/develop/audios/track-123.mp3');
    });

    it('debería lanzar BadRequestException si el archivo es inválido (faltan datos)', async () => {
      // Arrange
      const putObjectDto = { key: 'track-123' };
      const invalidFile: any = { ...mockAudioFile, buffer: undefined }; // Simulamos un archivo sin buffer

      // Act & Assert
      await expect(
        service.uploadObject(putObjectDto, invalidFile as any)
      ).rejects.toThrow(BadRequestException);
      
      await expect(
        service.uploadObject(putObjectDto, invalidFile as any)
      ).rejects.toThrow('Archivo inválido'); // El mensaje exacto de tu servicio
    });

    it('debería lanzar BadRequestException si AWS S3 falla', async () => {
      // Arrange
      const putObjectDto = { key: 'track-123' };
      
      // Simulamos que S3 arroja un error (ej. credenciales inválidas o bucket no existe)
      const s3SendMock = jest.spyOn(
        S3Client.prototype,
        'send',
      ) as any;

      s3SendMock.mockRejectedValueOnce(new Error('S3 Upload Failed'));

      // Act & Assert
      await expect(
        service.uploadObject(putObjectDto, mockAudioFile)
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.uploadObject(putObjectDto, mockAudioFile)
      ).rejects.toThrow('S3 Upload Failed');
    });
  });
});