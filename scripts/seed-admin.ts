/**
 * Script de seed para crear (o promover) el primer usuario superadmin.
 *
 * El privilegio de administración vive en la columna `plan_type`
 * (`UserPlanType`), no en `role` (que es un dato descriptivo de tipo
 * `MusicRole`: compositor/intérprete/etc. y no acepta 'admin'/'superadmin').
 * `StaffPermissionGuard` da acceso total a cualquier usuario con
 * `plan_type = 'superadmin'`, así que basta con esa columna — además se
 * sincroniza `staff_user_roles` con el rol interno "Super Admin" para que
 * el usuario también aparezca correctamente en el panel de staff.
 *
 * Uso local:
 *   SEED_ADMIN_PASSWORD=<password> SEED_ADMIN_CITIZEN_ID=<numero-de-documento> \
 *   npm run seed:admin
 *
 * Uso en desarrollo (usa las mismas credenciales de .env.local que NODE_ENV=local):
 *   SEED_ADMIN_PASSWORD=<password> SEED_ADMIN_CITIZEN_ID=<numero-de-documento> \
 *   npm run seed:admin:dev
 *
 * Uso en producción:
 *   CONFIRM_PRODUCTION_SEED=yes \
 *   SEED_ADMIN_EMAIL=admin@musila.com SEED_ADMIN_PASSWORD=<password-fuerte> \
 *   SEED_ADMIN_CITIZEN_ID=<numero-de-documento> \
 *   npm run seed:admin:prod
 *
 * SEED_ADMIN_PASSWORD y SEED_ADMIN_CITIZEN_ID son obligatorios en todos los
 * entornos (sin default): el login (`LoginAuthDto`) se hace con el número de
 * documento (citizenID) + password, no con el email — el email es solo un
 * dato de contacto. Sin estos valores explícitos el script no arranca.
 *
 * Variables opcionales:
 *   SEED_ADMIN_NAME, SEED_ADMIN_LAST_NAME
 *   SEED_ADMIN_PLAN_TYPE = superadmin | admin   (default: superadmin)
 *
 * La conexión:
 *   - local/development: .env.local  (DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME)
 *   - production:        .env.production (DB_URL, con SSL)
 *
 * NODE_ENV=development reutiliza .env.local (a diferencia de
 * src/shared/config/database/data-source.ts, que para ese entorno lee .env
 * con DATABASE_URL) porque las credenciales de siembra de este equipo viven
 * en .env.local.
 */

import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { Client, ClientConfig } from 'pg';
import * as path from 'path';
import { generateMcid } from '../src/creator-id/utils/generate-mcid.util';

const nodeEnv = process.env.NODE_ENV || 'local';

if (nodeEnv === 'local' || nodeEnv === 'development') {
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

const VALID_PLAN_TYPES = ['superadmin', 'admin'] as const;
type AdminPlanType = (typeof VALID_PLAN_TYPES)[number];

const requestedPlanType = (process.env.SEED_ADMIN_PLAN_TYPE || 'superadmin').toLowerCase();
if (!VALID_PLAN_TYPES.includes(requestedPlanType as AdminPlanType)) {
  console.error(
    `✘ SEED_ADMIN_PLAN_TYPE inválido: "${requestedPlanType}". Valores permitidos: ${VALID_PLAN_TYPES.join(', ')}.`,
  );
  process.exit(1);
}
const planType = requestedPlanType as AdminPlanType;
const staffRoleSlug = planType === 'superadmin' ? 'super-admin' : 'admin';

if (!process.env.SEED_ADMIN_CITIZEN_ID) {
  console.error(
    '✘ SEED_ADMIN_CITIZEN_ID es obligatorio: es el número de documento con el que se inicia sesión (LoginAuthDto.citizenID).',
  );
  process.exit(1);
}

if (!process.env.SEED_ADMIN_PASSWORD) {
  console.error(
    '✘ SEED_ADMIN_PASSWORD es obligatorio: es la contraseña con la que se inicia sesión (LoginAuthDto.password).',
  );
  process.exit(1);
}

const ADMIN = {
  name: process.env.SEED_ADMIN_NAME || 'Juan',
  lastName: process.env.SEED_ADMIN_LAST_NAME || 'Pérez',
  email: process.env.SEED_ADMIN_EMAIL || 'admin@musila.com',
  password: process.env.SEED_ADMIN_PASSWORD,
  citizenID: process.env.SEED_ADMIN_CITIZEN_ID,
};

function getClientConfig(): ClientConfig {
  if (nodeEnv === 'production') {
    return {
      connectionString: process.env.DB_URL,
      ssl: { rejectUnauthorized: false },
    };
  }

  // local y development comparten .env.local, sin DATABASE_URL.
  return {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? +process.env.DB_PORT : 5432,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  };
}

async function generateUniqueMcid(client: Client): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateMcid();
    const { rowCount } = await client.query(
      'SELECT 1 FROM users WHERE musila_creator_id = $1',
      [candidate],
    );
    if (rowCount === 0) return candidate;
  }
  throw new Error('No se pudo generar un Musila Creator ID único, intenta de nuevo');
}

async function syncStaffRole(client: Client, userId: string): Promise<void> {
  const role = await client.query('SELECT id FROM staff_roles WHERE slug = $1', [staffRoleSlug]);
  if (role.rowCount === 0) {
    console.warn(
      `⚠ No existe el rol interno "${staffRoleSlug}" en staff_roles (¿faltan migraciones por correr?). Se omite la sincronización de staff_user_roles.`,
    );
    return;
  }

  await client.query(
    `INSERT INTO staff_user_roles (user_id, staff_role_id, assigned_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET staff_role_id = EXCLUDED.staff_role_id, updated_at = NOW()`,
    [userId, role.rows[0].id],
  );
}

async function main() {
  const client = new Client(getClientConfig());

  await client.connect();
  console.log(`✔ Conectado a la base de datos (NODE_ENV=${nodeEnv})`);

  const existing = await client.query(
    'SELECT id, email, plan_type FROM users WHERE email = $1',
    [ADMIN.email],
  );

  let userId: string;

  if (existing.rowCount > 0) {
    const row = existing.rows[0];
    userId = row.id;
    const hashedPassword = await bcrypt.hash(ADMIN.password, 10);
    await client.query(
      'UPDATE users SET plan_type = $1, citizen_id = $2, password = $3 WHERE id = $4',
      [planType, ADMIN.citizenID, hashedPassword, userId],
    );
    console.log(`✔ Usuario actualizado → plan_type=${planType} (id: ${userId})`);
    console.log(`  Número de documento (login): ${ADMIN.citizenID}`);
    if (nodeEnv !== 'production') {
      console.log(`  Password: ${ADMIN.password}`);
    }
  } else {
    const hashedPassword = await bcrypt.hash(ADMIN.password, 10);
    const musilaCreatorId = await generateUniqueMcid(client);

    const result = await client.query(
      `INSERT INTO users (name, last_name, email, password, plan_type, role, citizen_id, musila_creator_id, is_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'compositor', $6, $7, true, NOW(), NOW())
       RETURNING id`,
      [ADMIN.name, ADMIN.lastName, ADMIN.email, hashedPassword, planType, ADMIN.citizenID, musilaCreatorId],
    );

    userId = result.rows[0].id;
    console.log(`✔ Usuario ${planType} creado — id: ${userId}`);
    console.log(`  Número de documento (login): ${ADMIN.citizenID}`);
    console.log(`  Email: ${ADMIN.email}`);
    console.log(`  Musila Creator ID: ${musilaCreatorId}`);
    if (nodeEnv !== 'production') {
      console.log(`  Password: ${ADMIN.password}`);
    }
  }

  await syncStaffRole(client, userId);

  await client.end();
}

main().catch((err) => {
  console.error('✘ Error:', err.message);
  process.exit(1);
});
