/**
 * Script de seed para crear (o promover) el primer usuario administrador.
 *
 * Uso local:
 *   npx ts-node -r tsconfig-paths/register scripts/seed-admin.ts
 *
 * Uso en producción:
 *   NODE_ENV=production CONFIRM_PRODUCTION_SEED=yes \
 *   SEED_ADMIN_EMAIL=admin@musila.com SEED_ADMIN_PASSWORD=<password-fuerte> \
 *   npx ts-node -r tsconfig-paths/register scripts/seed-admin.ts
 *
 * La conexión sigue el mismo esquema que src/shared/config/database/data-source.ts:
 *   - local:       .env.local  (DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME)
 *   - development: .env        (DATABASE_URL, con SSL)
 *   - production:  .env.production (DB_URL, con SSL)
 */

import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { Client, ClientConfig } from 'pg';
import * as path from 'path';

const nodeEnv = process.env.NODE_ENV || 'local';

if (nodeEnv === 'local') {
  dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
} else if (nodeEnv === 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../.env.production') });
} else {
  dotenv.config();
}

if (nodeEnv === 'production' && process.env.CONFIRM_PRODUCTION_SEED !== 'yes') {
  console.error(
    '✘ NODE_ENV=production requiere CONFIRM_PRODUCTION_SEED=yes explícito para evitar ejecuciones accidentales.',
  );
  process.exit(1);
}

const ADMIN = {
  name: process.env.SEED_ADMIN_NAME || 'Juan',
  lastName: process.env.SEED_ADMIN_LAST_NAME || 'Pérez',
  email: process.env.SEED_ADMIN_EMAIL || 'admin@musila.com',
  password: process.env.SEED_ADMIN_PASSWORD || 'miContraseña123',
  citizenID: process.env.SEED_ADMIN_CITIZEN_ID || 'ADMIN001',
};

function getClientConfig(): ClientConfig {
  switch (nodeEnv) {
    case 'production':
      return {
        connectionString: process.env.DB_URL,
        ssl: { rejectUnauthorized: false },
      };
    case 'development':
      return {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      };
    default:
      return {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT ? +process.env.DB_PORT : 5432,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      };
  }
}

async function main() {
  const client = new Client(getClientConfig());

  await client.connect();
  console.log(`✔ Conectado a la base de datos (NODE_ENV=${nodeEnv})`);

  // Verificar si ya existe
  const existing = await client.query(
    'SELECT id, email, role FROM users WHERE email = $1',
    [ADMIN.email],
  );

  if (existing.rowCount > 0) {
    const row = existing.rows[0];
    // Siempre sincroniza role y citizen_id para garantizar acceso
    await client.query(
      'UPDATE users SET role = $1, citizen_id = $2 WHERE id = $3',
      ['admin', ADMIN.citizenID, row.id],
    );
    console.log(`✔ Usuario actualizado → role=admin, citizenID=${ADMIN.citizenID} (id: ${row.id})`);
    await client.end();
    return;
  }

  // Crear usuario nuevo
  const hashedPassword = await bcrypt.hash(ADMIN.password, 10);
  const result = await client.query(
    `INSERT INTO users (name, last_name, email, password, role, citizen_id, is_verified, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'admin', $5, true, NOW(), NOW())
     RETURNING id`,
    [ADMIN.name, ADMIN.lastName, ADMIN.email, hashedPassword, ADMIN.citizenID],
  );

  console.log(`✔ Administrador creado — id: ${result.rows[0].id}`);
  console.log(`  Email: ${ADMIN.email}`);
  if (nodeEnv !== 'production') {
    console.log(`  Password: ${ADMIN.password}`);
  }

  await client.end();
}

main().catch((err) => {
  console.error('✘ Error:', err.message);
  process.exit(1);
});
