/**
 * Aritmética monetaria sin `float` (§12). Los importes se manejan en la moneda
 * menor (centavos) como enteros y el porcentaje con 2 decimales se escala a
 * enteros ("centésimas de punto") para evitar el error de coma flotante:
 *
 *   commissionCents = round(licenseCents * rateHundredths / 10000)
 *
 * Ejemplo: 3.000.000 COP × 7,50% = 300.000.000 centavos × 750 / 10.000
 *          = 22.500.000 centavos = 225.000,00 COP.
 */

/** Convierte un importe en unidad mayor (p. ej. COP) a centavos enteros. */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Comisión en centavos a partir del importe base en centavos y un porcentaje
 * con hasta 2 decimales. Redondeo a centavo (half-up estándar de Math.round).
 */
export function commissionCentsFor(baseCents: number, ratePercent: number): number {
  const rateHundredths = Math.round(ratePercent * 100); // 7.50 -> 750
  return Math.round((baseCents * rateHundredths) / 10000);
}
