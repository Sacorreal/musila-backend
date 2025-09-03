import { TypeOrmModuleOptions } from '@nestjs/typeorm';

const nodeEnv = process.env.NODE_ENV;
const useSSL = process.env.DB_SSL === 'true';

export let databaseConfig: TypeOrmModuleOptions;

switch (nodeEnv) {
  case 'local':
    databaseConfig = {
      type: 'postgres',
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? +process.env.DB_PORT : 5432,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: true,
    };
    break;

  case 'development':
    databaseConfig = {
      type: 'postgres',
      url: process.env.DB_URL,
      autoLoadEntities: true,
      synchronize: true,
      ...(useSSL && {
        ssl: {
          ca: process.env.DB_CA_CERT,
          rejectUnauthorized: false,
        },
      }),
    };
    break;

  case 'production':
    databaseConfig = {
      type: 'postgres',
      url: process.env.DB_URL,
      autoLoadEntities: true,
      synchronize: true,
      ssl: {
        ca: process.env.DB_CA_CERT,
        rejectUnauthorized: false,
      },
    };
    break;

  default:
    throw new Error(
      `NODE_ENV "${nodeEnv}" no es válido para la configuración de base de datos.`,
    );
}
