/**
 * Entrada del snapshot inmutable de comisión de publisher congelado en
 * `RequestedTrack` al iniciar el pago de una licencia. Guarda solo la tarifa
 * por vendedor; el monto se calcula por evento en la distribución para que los
 * anticipos por cuotas prorrateen consistentemente con la tarifa congelada.
 */
export interface PublisherCommissionSnapshotEntry {
  beneficiaryUserId: string;
  publisherOrganizationId: string;
  percentage: number;
}

/** Un miembro del roster junto con su porcentaje de comisión configurado. */
export interface RosterCommissionView {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  percentage: number;
}

/** Vista de la configuración de comisión de una publisher (toggle + roster). */
export interface PublisherCommissionPolicyView {
  organizationId: string;
  commissionEnabled: boolean;
  roster: RosterCommissionView[];
}
