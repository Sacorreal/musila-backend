import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PlanCapability } from 'src/entitlements/entities/plan-capability.entity';
import { SubjectType } from 'src/entitlements/entities/subject-type.enum';
import { Subscription } from 'src/entitlements/entities/subscription.entity';
import { SubscriptionStatus } from 'src/entitlements/entities/subscription-status.enum';
import { OrganizationType } from 'src/organizations/entities/organization-type.enum';
import { MembershipStatus } from 'src/organizations/entities/membership-status.enum';
import { TenantType } from 'src/organizations/entities/tenant-type.enum';
import { MembershipService, ResolvedMembership } from 'src/organizations/membership.service';
import { OrganizationsService } from 'src/organizations/organizations.service';
import { Repository } from 'typeorm';
import { AuthorizationCacheService } from './cache/authorization-cache.service';
import { Capability } from './entities/capability.entity';
import { CapabilityScope } from './entities/capability-scope.enum';
import { CapabilitySubject } from './entities/capability-subject.enum';
import { MembershipRole } from './entities/membership-role.entity';
import { MembershipType } from './entities/membership-type.enum';
import { RoleType } from './entities/role-type.enum';
import {
  AuthorizationContext,
  AuthorizationDecision,
  AuthorizationDenyCode,
  CapabilityGrant,
  CapabilityRequirement,
  EffectiveCapabilities,
  ResourceOwnership,
} from './interfaces/authorization.types';

type ContextResolution =
  | { ok: true; effective: EffectiveCapabilities }
  | { ok: false; decision: AuthorizationDecision };

const ROLE_TYPE_TO_SUBJECT: Record<RoleType, CapabilitySubject> = {
  [RoleType.PLATFORM]: CapabilitySubject.PLATFORM_MEMBER,
  [RoleType.ORGANIZATION]: CapabilitySubject.ORGANIZATION_MEMBER,
  [RoleType.ROSTER]: CapabilitySubject.ROSTER_MEMBER,
};

/**
 * PolicyEngine del sistema (§10): resuelve las capabilities efectivas de un
 * usuario en un contexto (personal+plataforma u organización) y evalúa
 * requirements con AND/OR. Los límites comerciales (entitlements/usage) se
 * validan aparte, en el momento del consumo (EntitlementConsumeInterceptor).
 *
 * Regla crítica: aquí no existe ningún `if plan === X` ni bypass por
 * planType — todo se deriva de datos (roles, planes, catálogos).
 */
@Injectable()
export class AuthorizationService {
  constructor(
    @InjectRepository(MembershipRole)
    private readonly membershipRoleRepository: Repository<MembershipRole>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(PlanCapability)
    private readonly planCapabilityRepository: Repository<PlanCapability>,
    private readonly membershipService: MembershipService,
    private readonly organizationsService: OrganizationsService,
    private readonly cache: AuthorizationCacheService,
  ) {}

  async check(
    context: AuthorizationContext,
    requirement: CapabilityRequirement,
  ): Promise<AuthorizationDecision> {
    const resolution = await this.resolveContext(context);
    if (!resolution.ok) return resolution.decision;

    const { grants, exclusions } = resolution.effective;
    const missing = requirement.caps.filter((key) => !grants.has(key));

    const allowed =
      requirement.operator === 'OR'
        ? missing.length < requirement.caps.length
        : missing.length === 0;

    if (allowed) return { allowed: true };

    const code = missing
      .map((key) => exclusions.get(key))
      .find((excluded) => excluded !== undefined) ?? AuthorizationDenyCode.CAPABILITY_DENIED;

    return {
      allowed: false,
      code,
      missingCapabilities: missing,
      diagnostics: { operator: requirement.operator, required: requirement.caps },
    };
  }

  /**
   * Valida scopes OWN/ASSIGNED contra un recurso concreto. Es el reemplazo
   * estructurado de los bypass `isAdminPlanType()` dentro de los services.
   */
  async checkResource(
    context: AuthorizationContext,
    capabilityKey: string,
    ownership: ResourceOwnership,
  ): Promise<AuthorizationDecision> {
    const resolution = await this.resolveContext(context);
    if (!resolution.ok) return resolution.decision;

    const { grants, exclusions } = resolution.effective;
    const grant = grants.get(capabilityKey);

    if (!grant) {
      return {
        allowed: false,
        code: exclusions.get(capabilityKey) ?? AuthorizationDenyCode.CAPABILITY_DENIED,
        missingCapabilities: [capabilityKey],
      };
    }

    if (grant.scope === CapabilityScope.OWN) {
      const isOwner = ownership.ownerId === context.userId;
      return isOwner
        ? { allowed: true }
        : { allowed: false, code: AuthorizationDenyCode.SCOPE_DENIED, diagnostics: { scope: grant.scope } };
    }

    if (grant.scope === CapabilityScope.ASSIGNED) {
      const isAssigned = ownership.assignedUserIds?.includes(context.userId) ?? false;
      return isAssigned
        ? { allowed: true }
        : { allowed: false, code: AuthorizationDenyCode.SCOPE_DENIED, diagnostics: { scope: grant.scope } };
    }

    return { allowed: true };
  }

  /** Keys de capabilities efectivas del contexto (para /users/me/capabilities). */
  async getEffectiveCapabilityKeys(context: AuthorizationContext): Promise<string[]> {
    const resolution = await this.resolveContext(context);
    if (!resolution.ok) return [];
    return [...resolution.effective.grants.keys()].sort();
  }

  /**
   * Detalle completo para el Authorization Explorer (§25): capabilities con
   * origen (Role → X / Plan → Y), exclusiones con su código y membership.
   */
  async explain(context: AuthorizationContext): Promise<{
    membership?: ResolvedMembership;
    grants: CapabilityGrant[];
    exclusions: { capability: string; code: AuthorizationDenyCode }[];
    denied?: AuthorizationDecision;
  }> {
    const membership = context.organizationId
      ? await this.membershipService.findMembershipForOrganization(
          context.userId,
          context.organizationId,
        )
      : undefined;

    const resolution = await this.resolveContext(context);
    if (!resolution.ok) {
      return { membership, grants: [], exclusions: [], denied: resolution.decision };
    }

    return {
      membership,
      grants: [...resolution.effective.grants.values()],
      exclusions: [...resolution.effective.exclusions.entries()].map(([capability, code]) => ({
        capability,
        code,
      })),
    };
  }

  private async resolveContext(context: AuthorizationContext): Promise<ContextResolution> {
    const cached = this.cache.get(context.userId, context.organizationId);
    if (cached) return { ok: true, effective: cached };

    const resolution = context.organizationId
      ? await this.resolveOrganizationContext(context.userId, context.organizationId)
      : await this.resolvePersonalAndPlatformContext(context.userId);

    if (resolution.ok) {
      this.cache.set(context.userId, context.organizationId, resolution.effective);
    }

    return resolution;
  }

  /** Contexto sin organización: plan personal + memberships de plataforma (tenant MUSILA). */
  private async resolvePersonalAndPlatformContext(userId: string): Promise<ContextResolution> {
    const effective: EffectiveCapabilities = { grants: new Map(), exclusions: new Map() };

    const personalSubscription = await this.findActiveSubscription(SubjectType.USER, userId);
    if (personalSubscription) {
      const planCapabilities = await this.planCapabilityRepository.find({
        where: { planId: personalSubscription.planId },
      });

      for (const planCapability of planCapabilities) {
        const capability = planCapability.capability;
        if (!capability.isActive) continue;

        this.addGrant(effective, capability, this.defaultPersonalScope(capability), {
          type: 'PLAN',
          id: personalSubscription.plan.id,
          name: personalSubscription.plan.name,
        });
      }
    }

    const platformMemberships = await this.membershipService.findActivePlatformMemberships(userId);
    for (const membership of platformMemberships) {
      await this.collectRoleGrants(effective, MembershipType.ORGANIZATION, membership.id, {
        organizationType: undefined,
        allowedPlanCapabilityKeys: undefined,
      });
    }

    return { ok: true, effective };
  }

  /** Contexto de organización B2B: membership ACTIVE → roles → capabilities, con filtros de tipo y plan. */
  private async resolveOrganizationContext(
    userId: string,
    organizationId: string,
  ): Promise<ContextResolution> {
    const membership = await this.membershipService.findMembershipForOrganization(
      userId,
      organizationId,
    );

    if (!membership || membership.status !== MembershipStatus.ACTIVE) {
      return {
        ok: false,
        decision: {
          allowed: false,
          code: AuthorizationDenyCode.MEMBERSHIP_INACTIVE,
          diagnostics: {
            organizationId,
            membershipStatus: membership?.status ?? 'NO_MEMBERSHIP',
          },
        },
      };
    }

    const organization = await this.organizationsService.findById(organizationId);
    const isPlatformTenant = organization.tenant.type === TenantType.PLATFORM;

    let allowedPlanCapabilityKeys: Set<string> | undefined;
    if (!isPlatformTenant) {
      const organizationSubscription = await this.findActiveSubscription(
        SubjectType.ORGANIZATION,
        organizationId,
      );
      // Sin subscription activa no se restringe por plan (organización creada
      // por Musila sin plan contratado aún); con subscription, solo pasan las
      // capabilities incluidas en el plan B2B (§23).
      if (organizationSubscription) {
        const planCapabilities = await this.planCapabilityRepository.find({
          where: { planId: organizationSubscription.planId },
        });
        allowedPlanCapabilityKeys = new Set(
          planCapabilities.map((planCapability) => planCapability.capability.key),
        );
      }
    }

    const effective: EffectiveCapabilities = { grants: new Map(), exclusions: new Map() };
    await this.collectRoleGrants(effective, membership.type, membership.id, {
      organizationType: isPlatformTenant ? undefined : organization.type,
      allowedPlanCapabilityKeys,
    });

    return { ok: true, effective };
  }

  /** Acumula las capabilities otorgadas por los roles de una membership, aplicando los filtros del contexto. */
  private async collectRoleGrants(
    effective: EffectiveCapabilities,
    membershipType: MembershipType,
    membershipId: string,
    filters: {
      organizationType?: OrganizationType;
      allowedPlanCapabilityKeys?: Set<string>;
    },
  ): Promise<void> {
    const membershipRoles = await this.membershipRoleRepository.find({
      where: { membershipType, membershipId },
      relations: { role: { roleCapabilities: { capability: true } } },
    });

    for (const membershipRole of membershipRoles) {
      const role = membershipRole.role;
      if (!role.isActive) continue;

      for (const roleCapability of role.roleCapabilities ?? []) {
        const capability = roleCapability.capability;
        if (!capability.isActive) continue;

        const expectedSubject = ROLE_TYPE_TO_SUBJECT[role.type];
        if (
          capability.assignableTo.length > 0 &&
          !capability.assignableTo.includes(expectedSubject)
        ) {
          continue;
        }

        if (
          filters.organizationType &&
          capability.organizationTypes.length > 0 &&
          !capability.organizationTypes.includes(filters.organizationType)
        ) {
          effective.exclusions.set(
            capability.key,
            AuthorizationDenyCode.ORGANIZATION_TYPE_DENIED,
          );
          continue;
        }

        if (
          filters.allowedPlanCapabilityKeys &&
          !filters.allowedPlanCapabilityKeys.has(capability.key)
        ) {
          effective.exclusions.set(
            capability.key,
            AuthorizationDenyCode.PLAN_FEATURE_NOT_INCLUDED,
          );
          continue;
        }

        this.addGrant(effective, capability, roleCapability.scope, {
          type: 'ROLE',
          id: role.id,
          name: role.name,
        });
      }
    }
  }

  private addGrant(
    effective: EffectiveCapabilities,
    capability: Capability,
    scope: CapabilityScope,
    origin: CapabilityGrant['origins'][number],
  ): void {
    effective.exclusions.delete(capability.key);

    const existing = effective.grants.get(capability.key);
    if (existing) {
      existing.origins.push(origin);
      // Prevalece el scope más amplio según la jerarquía PLATFORM ⊃ ORGANIZATION ⊃ ROSTER ⊃ resto.
      if (this.scopeRank(scope) > this.scopeRank(existing.scope)) {
        existing.scope = scope;
      }
      return;
    }

    effective.grants.set(capability.key, { key: capability.key, scope, origins: [origin] });
  }

  private scopeRank(scope: CapabilityScope): number {
    switch (scope) {
      case CapabilityScope.PLATFORM:
        return 5;
      case CapabilityScope.ORGANIZATION:
        return 4;
      case CapabilityScope.ROSTER:
        return 3;
      case CapabilityScope.ASSIGNED:
        return 2;
      case CapabilityScope.OWN:
        return 1;
      default:
        return 0;
    }
  }

  /** Scope por defecto de una capability otorgada por plan personal: OWN si está permitido. */
  private defaultPersonalScope(capability: Capability): CapabilityScope {
    if (capability.allowedScopes.includes(CapabilityScope.OWN)) return CapabilityScope.OWN;
    return capability.allowedScopes[0] ?? CapabilityScope.CUSTOM;
  }

  private async findActiveSubscription(
    subjectType: SubjectType,
    subjectId: string,
  ): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: { subjectType, subjectId, status: SubscriptionStatus.ACTIVE },
    });
  }
}
