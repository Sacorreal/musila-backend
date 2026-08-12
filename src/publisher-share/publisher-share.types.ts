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
  percentage: number;
}
