import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

const nodeEnv = process.env.NODE_ENV || 'local';

if (nodeEnv === 'local') {
  dotenv.config({ path: '.env.local' });
} else if (nodeEnv === 'production') {
  dotenv.config({ path: '.env.production' });
} else {
  dotenv.config();
}

const shared = {
  entities: [join(__dirname, '../../../**/*.entity.{ts,js}')],
  migrations: [join(__dirname, '../../../migrations/*.{ts,js}')],
  migrationsTableName: 'typeorm_migrations' as string,
  logging: false as boolean,
};

let options: DataSourceOptions;

switch (nodeEnv) {
  case 'local':
    options = {
      type: 'postgres',
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? +process.env.DB_PORT : 5432,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ...shared,
    };
    break;

  case 'development':
    options = {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      ...shared,
    };
    break;

  case 'production':
    options = {
      type: 'postgres',
      url: process.env.DB_URL,
      ssl: { rejectUnauthorized: false },
      ...shared,
    };
    break;

  default:
    throw new Error(`NODE_ENV "${nodeEnv}" no es válido para la configuración de base de datos.`);
}

export const AppDataSource = new DataSource(options);
