import { CoauthorRole } from 'src/splits/entities/coauthor-role.enum';

/** Un miembro del roster junto con su configuración de coautoría por defecto. */
export interface RosterCoauthorDefaultView {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  enabled: boolean;
  role: CoauthorRole;
  percentage: number;
}

/** Vista de la configuración de coautoría por defecto de una publisher. */
export interface PublisherCoauthorPolicyView {
  organizationId: string;
  roster: RosterCoauthorDefaultView[];
}

/**
 * Coautoría por defecto resuelta que debe inyectarse en el split que crea un
 * usuario del roster. Un usuario puede pertenecer a varias publishers.
 */
export interface ResolvedPublisherCoauthor {
  organizationId: string;
  organizationName: string;
  role: CoauthorRole;
  percentage: number;
}
