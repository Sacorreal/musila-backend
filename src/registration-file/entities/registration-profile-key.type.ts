/**
 * Claves de los `RegistrationProfile` soportados hoy (Strategy en código,
 * ver `registration-file/profiles/`). Agregar un futuro perfil (Editorial,
 * Distribuidora) solo requiere extender esta unión, no migrar el esquema.
 */
export type RegistrationProfileKey = 'SAYCO' | 'DNDA';

export const REGISTRATION_PROFILE_KEYS: RegistrationProfileKey[] = ['SAYCO', 'DNDA'];
