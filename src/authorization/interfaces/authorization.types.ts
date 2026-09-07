import { CapabilityScope } from '../entities/capability-scope.enum';

/** Códigos de diagnóstico de una decisión DENY (§25 del requerimiento). */
export enum AuthorizationDenyCode {
  CAPABILITY_DENIED = 'CAPABILITY_DENIED',
  SCOPE_DENIED = 'SCOPE_DENIED',
  ORGANIZATION_TYPE_DENIED = 'ORGANIZATION_TYPE_DENIED',
  ENTITLEMENT_EXCEEDED = 'ENTITLEMENT_EXCEEDED',
  MEMBERSHIP_INACTIVE = 'MEMBERSHIP_INACTIVE',
  PLAN_FEATURE_NOT_INCLUDED = 'PLAN_FEATURE_NOT_INCLUDED',
  CAPABILITY_NOT_AVAILABLE_FOR_ORGANIZATION_TYPE = 'CAPABILITY_NOT_AVAILABLE_FOR_ORGANIZATION_TYPE',
}

export type CapabilityOperator = 'AND' | 'OR';

export interface CapabilityRequirement {
  caps: string[];
  operator: CapabilityOperator;
}

/**
 * Contexto sobre el que se evalúa la autorización. `organizationId` llega
 * del param de ruta o del header `x-organization-id`, pero nunca se confía:
 * el motor valida la membership ACTIVE en BD (§14).
 */
export interface AuthorizationContext {
  userId: string;
  organizationId?: string;
}

export type CapabilityOriginType = 'ROLE' | 'PLAN';

export interface CapabilityOrigin {
  type: CapabilityOriginType;
  id: string;
  name: string;
}

/** Capability efectiva con su scope y el origen que la otorga (rol o plan). */
export interface CapabilityGrant {
  key: string;
  scope: CapabilityScope;
  origins: CapabilityOrigin[];
}

/**
 * Resultado de resolver un contexto: capabilities efectivas más el motivo
 * por el que quedaron excluidas las que un rol otorgaba pero el motor
 * descartó (tipo de organización incompatible, plan que no la incluye...).
 */
export interface EffectiveCapabilities {
  grants: Map<string, CapabilityGrant>;
  exclusions: Map<string, AuthorizationDenyCode>;
}

export interface AuthorizationDecision {
  allowed: boolean;
  code?: AuthorizationDenyCode;
  missingCapabilities?: string[];
  diagnostics?: Record<string, unknown>;
}

/** Recurso concreto contra el que se valida un scope OWN/ASSIGNED. */
export interface ResourceOwnership {
  ownerId?: string;
  assignedUserIds?: string[];
}
