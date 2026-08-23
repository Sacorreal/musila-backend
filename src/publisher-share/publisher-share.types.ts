/** Un miembro del roster junto con su Publisher's Share configurado. */
export interface RosterPublisherShareView {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  enabled: boolean;
  percentage: number;
}

/** Vista de la configuración de Publisher's Share de una publisher. */
export interface PublisherSharePolicyView {
  organizationId: string;
  roster: RosterPublisherShareView[];
}

/**
 * Publisher's Share resuelto que se inyecta como metadata en las canciones que
 * publica un usuario del roster. Un usuario puede pertenecer a varias publishers.
 */
export interface ResolvedPublisherShare {
  organizationId: string;
  organizationName: string;
  organizationIpiNumber: string | null;
  percentage: number;
  contractUrl: string | null;
  /** Fecha de confirmación vía el flujo de incorporación al roster (Flow 2); `null` si solo se bulk-editó. */
  confirmedAt: Date | null;
}
