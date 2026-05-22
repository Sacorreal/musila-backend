/**
 * Script de seed para crear el primer usuario administrador.
 * Uso: npx ts-node -r tsconfig-paths/register scripts/seed-admin.ts
 */

import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { Client } from 'pg';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const ADMIN = {
  name: 'Juan',
  lastName: 'Pérez',
  email: 'admin@musila.com',
  password: 'miContraseña123',
  citizenID: 'ADMIN001',
};

async function main() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? +process.env.DB_PORT : 5432,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  await client.connect();
  console.log('✔ Conectado a la base de datos');

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
    `INSERT INTO users (name, last_name, email, password, role, citizen_id, is_verified, is_user_free, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'admin', $5, true, true, NOW(), NOW())
     RETURNING id`,
    [ADMIN.name, ADMIN.lastName, ADMIN.email, hashedPassword, ADMIN.citizenID],
  );

  console.log(`✔ Administrador creado — id: ${result.rows[0].id}`);
  console.log(`  Email:    ${ADMIN.email}`);
  console.log(`  Password: ${ADMIN.password}`);

  await client.end();
}

main().catch((err) => {
  console.error('✘ Error:', err.message);
  process.exit(1);
});
