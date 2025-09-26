import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { STORAGE_OPTIONS } from './constants/storage-options.constants';
import { StorageOptions } from './interface/storage-options.interface';
import { StorageService } from './storage.service';

@Global()
@Module({})
export class StorageModule {
  static forRootAsync(): DynamicModule {
    return {
      module: StorageModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: STORAGE_OPTIONS,
          inject: [ConfigService],
          useFactory: (config: ConfigService): StorageOptions => ({
            accessKeyId: config.getOrThrow<string>('STORAGE_ACCESS_KEY_ID'),
            bucket: config.getOrThrow<string>('STORAGE_BUCKET'),
            endpoint: config.getOrThrow<string>('STORAGE_ENDPOINT'),
            region: config.getOrThrow<string>('STORAGE_REGION'),
            secretAccessKey: config.getOrThrow<string>('STORAGE_SECRET_KEY'),
            environment: config.getOrThrow<string>('NODE_ENV'),
          }),
        },
        StorageService,
      ],
      exports: [StorageService],
    };
  }
}
