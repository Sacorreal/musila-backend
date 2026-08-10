import type { Request } from 'express';

export const ORGANIZATION_ID_HEADER = 'x-organization-id';

/**
 * Resuelve el organizationId del request con la precedencia definida en el
 * diseño: param de ruta > header. El valor es una *pretensión* del cliente;
 * la validación real de membership la hace siempre el AuthorizationService.
 */
export function resolveOrganizationId(request: Request): string | undefined {
  const fromParam = (request.params as Record<string, string> | undefined)?.organizationId;
  if (fromParam) return fromParam;

  const fromHeader = request.headers[ORGANIZATION_ID_HEADER];
  if (typeof fromHeader === 'string' && fromHeader.length > 0) return fromHeader;

  return undefined;
}
