import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: process.env.DB_URL,
        ssl: {
          rejectUnauthorized: false,
        },
        username: process.env.DB_USERNAME,

        /*host: process.env.DB_HOST,
        port: process.env.DB_PORT ? +process.env.DB_PORT : 5432,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,*/

        autoLoadEntities: true, // Carga automáticamente las entidades registradas
        synchronize: true, //TODO: cambiar a false en prod.
      }),
    }),
  ],
})
export class DatabaseModule {}
