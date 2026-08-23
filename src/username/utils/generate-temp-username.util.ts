import * as crypto from 'crypto';

const DIACRITICS_RANGE = String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f);
const DIACRITICS_REGEX = new RegExp('[' + DIACRITICS_RANGE + ']', 'g');

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '') // quitar tildes/diacriticos
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Genera un username temporal derivado del nombre, usado unicamente por la
 * migracion de backfill de usuarios preexistentes (Musila Creator ID ->
 * username). El usuario queda marcado con `usernameIsTemporary: true` y debe
 * reemplazarlo por uno definitivo.
 */
export function generateTempUsername(name: string, lastName: string): string {
  const rawBase = `${slugify(name)}${slugify(lastName)}`;
  const base = (rawBase.length > 0 ? rawBase : 'usuario').slice(0, 13);
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${base}_${suffix}`.slice(0, 20);
}
