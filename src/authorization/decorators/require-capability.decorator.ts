import { SetMetadata } from '@nestjs/common';
import {
  CapabilityOperator,
  CapabilityRequirement,
} from '../interfaces/authorization.types';

export const REQUIRE_CAPABILITY_KEY = 'require_capability';

/**
 * Declara la(s) capability(ies) que exige un endpoint (§21/§27 del
 * requerimiento). Acepta una sola, varias con AND (todas) o varias con OR
 * (al menos una):
 *
 *   @RequireCapability('track.create')
 *   @RequireCapability(['track.edit', 'track.publish'])            // AND
 *   @RequireCapability(['catalog.view', 'reports.view'], 'OR')
 */
export const RequireCapability = (
  capabilities: string | string[],
  operator: CapabilityOperator = 'AND',
) =>
  SetMetadata<string, CapabilityRequirement>(REQUIRE_CAPABILITY_KEY, {
    caps: Array.isArray(capabilities) ? capabilities : [capabilities],
    operator,
  });
