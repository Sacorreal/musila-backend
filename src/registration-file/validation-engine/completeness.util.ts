/** True si un valor cuenta como "diligenciado" para efectos de completitud. */
export function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

/** % de campos diligenciados sobre el total, redondeado. */
export function percentageFilled(values: unknown[]): number {
  if (values.length === 0) return 100;
  const filled = values.filter(isFilled).length;
  return Math.round((filled / values.length) * 100);
}

/** Redondea a 2 decimales, evitando errores de coma flotante en sumas de porcentajes. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Adapta un booleano (ej. "¿existe el documento X?") al criterio de
 * `isFilled`/`percentageFilled`, donde `false` debe contar como "no
 * diligenciado" — a diferencia de `isFilled(false)`, que lo trataría como
 * presente por no ser `null`/`undefined`.
 */
export function boolAsFilled(value: boolean): true | null {
  return value || null;
}
