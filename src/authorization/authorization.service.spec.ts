import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlanCapability } from 'src/entitlements/entities/plan-capability.entity';
import { Subscription } from 'src/entitlements/entities/subscription.entity';
import { MembershipStatus } from 'src/organizations/entities/membership-status.enum';
import { OrganizationType } from 'src/organizations/entities/organization-type.enum';
import { TenantType } from 'src/organizations/entities/tenant-type.enum';
import { MembershipService } from 'src/organizations/membership.service';
import { OrganizationsService } from 'src/organizations/organizations.service';
import { AuthorizationService } from './authorization.service';
import { AuthorizationCacheService } from './cache/authorization-cache.service';
import { CapabilityScope } from './entities/capability-scope.enum';
import { CapabilitySubject } from './entities/capability-subject.enum';
import { MembershipRole } from './entities/membership-role.entity';
import { MembershipType } from './entities/membership-type.enum';
import { RoleType } from './entities/role-type.enum';
import { AuthorizationDenyCode } from './interfaces/authorization.types';

const capability = (key: string, overrides: Record<string, unknown> = {}) => ({
  id: `cap-${key}`,
  key,
  isActive: true,
  assignableTo: [],
  allowedScopes: [CapabilityScope.OWN],
  organizationTypes: [],
  ...overrides,
});

const makeRepoMock = () => ({ find: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null) });

describe('AuthorizationService (PolicyEngine)', () => {
  let service: AuthorizationService;
  let membershipRoleRepo: ReturnType<typeof makeRepoMock>;
  let subscriptionRepo: ReturnType<typeof makeRepoMock>;
  let planCapabilityRepo: ReturnType<typeof makeRepoMock>;
  let membershipService: {
    findMembershipForOrganization: jest.Mock;
    findActivePlatformMemberships: jest.Mock;
  };
  let organizationsService: { findById: jest.Mock };

  beforeEach(async () => {
    membershipRoleRepo = makeRepoMock();
    subscriptionRepo = makeRepoMock();
    planCapabilityRepo = makeRepoMock();
    membershipService = {
      findMembershipForOrganization: jest.fn(),
      findActivePlatformMemberships: jest.fn().mockResolvedValue([]),
    };
    organizationsService = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthorizationService,
        AuthorizationCacheService,
        { provide: getRepositoryToken(MembershipRole), useValue: membershipRoleRepo },
        { provide: getRepositoryToken(Subscription), useValue: subscriptionRepo },
        { provide: getRepositoryToken(PlanCapability), useValue: planCapabilityRepo },
        { provide: MembershipService, useValue: membershipService },
        { provide: OrganizationsService, useValue: organizationsService },
      ],
    }).compile();

    service = module.get(AuthorizationService);
  });

  const givePersonalPlan = (capabilities: ReturnType<typeof capability>[]) => {
    subscriptionRepo.findOne.mockResolvedValue({
      id: 'sub-1',
      planId: 'plan-1',
      plan: { id: 'plan-1', key: 'AUTOR_FREE', name: 'Autor Free' },
    });
    planCapabilityRepo.find.mockResolvedValue(
      capabilities.map((cap) => ({ planId: 'plan-1', capability: cap })),
    );
  };

  describe('contexto personal', () => {
    it('permite una capability otorgada por el plan personal', async () => {
      givePersonalPlan([capability('track.create')]);

      const decision = await service.check(
        { userId: 'user-1' },
        { caps: ['track.create'], operator: 'AND' },
      );

      expect(decision.allowed).toBe(true);
    });

    it('deniega con CAPABILITY_DENIED cuando el plan no incluye la capability', async () => {
      givePersonalPlan([capability('track.create')]);

      const decision = await service.check(
        { userId: 'user-1' },
        { caps: ['marketplace.search'], operator: 'AND' },
      );

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(AuthorizationDenyCode.CAPABILITY_DENIED);
      expect(decision.missingCapabilities).toEqual(['marketplace.search']);
    });

    it('AND exige todas las capabilities; OR acepta con una sola', async () => {
      givePersonalPlan([capability('track.create')]);

      const andDecision = await service.check(
        { userId: 'user-1' },
        { caps: ['track.create', 'marketplace.search'], operator: 'AND' },
      );
      const orDecision = await service.check(
        { userId: 'user-1' },
        { caps: ['track.create', 'marketplace.search'], operator: 'OR' },
      );

      expect(andDecision.allowed).toBe(false);
      expect(orDecision.allowed).toBe(true);
    });

    it('usa la caché en llamadas repetidas del mismo contexto', async () => {
      givePersonalPlan([capability('track.create')]);

      await service.check({ userId: 'user-1' }, { caps: ['track.create'], operator: 'AND' });
      await service.check({ userId: 'user-1' }, { caps: ['track.create'], operator: 'AND' });

      expect(planCapabilityRepo.find).toHaveBeenCalledTimes(1);
    });
  });

  describe('contexto de organización', () => {
    const organization = {
      id: 'org-1',
      tenantId: 'tenant-1',
      type: OrganizationType.PUBLISHER,
      tenant: { id: 'tenant-1', type: TenantType.ORGANIZATION },
    };

    const giveMembershipWithRole = (caps: ReturnType<typeof capability>[]) => {
      membershipService.findMembershipForOrganization.mockResolvedValue({
        type: MembershipType.ORGANIZATION,
        id: 'membership-1',
        status: MembershipStatus.ACTIVE,
        organizationId: 'org-1',
      });
      organizationsService.findById.mockResolvedValue(organization);
      membershipRoleRepo.find.mockResolvedValue([
        {
          role: {
            id: 'role-1',
            name: 'A&R',
            type: RoleType.ORGANIZATION,
            isActive: true,
            roleCapabilities: caps.map((cap) => ({
              capability: cap,
              scope: CapabilityScope.ORGANIZATION,
            })),
          },
        },
      ]);
    };

    it('deniega con MEMBERSHIP_INACTIVE si no existe membership', async () => {
      membershipService.findMembershipForOrganization.mockResolvedValue(undefined);

      const decision = await service.check(
        { userId: 'user-1', organizationId: 'org-1' },
        { caps: ['roster.view'], operator: 'AND' },
      );

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(AuthorizationDenyCode.MEMBERSHIP_INACTIVE);
    });

    it('deniega con MEMBERSHIP_INACTIVE si la membership está SUSPENDED', async () => {
      membershipService.findMembershipForOrganization.mockResolvedValue({
        type: MembershipType.ORGANIZATION,
        id: 'membership-1',
        status: MembershipStatus.SUSPENDED,
        organizationId: 'org-1',
      });

      const decision = await service.check(
        { userId: 'user-1', organizationId: 'org-1' },
        { caps: ['roster.view'], operator: 'AND' },
      );

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(AuthorizationDenyCode.MEMBERSHIP_INACTIVE);
    });

    it('deniega con ORGANIZATION_TYPE_DENIED cuando el tipo de organización es incompatible', async () => {
      giveMembershipWithRole([
        capability('analytics.advanced.view', {
          organizationTypes: [OrganizationType.LABEL],
          assignableTo: [CapabilitySubject.ORGANIZATION_MEMBER],
        }),
      ]);

      const decision = await service.check(
        { userId: 'user-1', organizationId: 'org-1' },
        { caps: ['analytics.advanced.view'], operator: 'AND' },
      );

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(AuthorizationDenyCode.ORGANIZATION_TYPE_DENIED);
    });

    it('deniega con PLAN_FEATURE_NOT_INCLUDED cuando el plan B2B no incluye la capability', async () => {
      giveMembershipWithRole([
        capability('campaign.create', {
          assignableTo: [CapabilitySubject.ORGANIZATION_MEMBER],
        }),
      ]);
      subscriptionRepo.findOne.mockResolvedValue({
        id: 'sub-org',
        planId: 'plan-b2b',
        plan: { id: 'plan-b2b', key: 'PUBLISHER_BASIC', name: 'Publisher Basic' },
      });
      planCapabilityRepo.find.mockResolvedValue([
        { planId: 'plan-b2b', capability: capability('roster.view') },
      ]);

      const decision = await service.check(
        { userId: 'user-1', organizationId: 'org-1' },
        { caps: ['campaign.create'], operator: 'AND' },
      );

      expect(decision.allowed).toBe(false);
      expect(decision.code).toBe(AuthorizationDenyCode.PLAN_FEATURE_NOT_INCLUDED);
    });

    it('permite la capability cuando rol, tipo de organización y plan coinciden', async () => {
      giveMembershipWithRole([
        capability('roster.view', {
          organizationTypes: [OrganizationType.PUBLISHER],
          assignableTo: [CapabilitySubject.ORGANIZATION_MEMBER],
        }),
      ]);
      subscriptionRepo.findOne.mockResolvedValue(null);

      const decision = await service.check(
        { userId: 'user-1', organizationId: 'org-1' },
        { caps: ['roster.view'], operator: 'AND' },
      );

      expect(decision.allowed).toBe(true);
    });
  });

  describe('checkResource (scopes OWN/ASSIGNED)', () => {
    it('OWN permite al dueño y deniega con SCOPE_DENIED a terceros', async () => {
      givePersonalPlan([capability('track.edit', { allowedScopes: [CapabilityScope.OWN] })]);

      const asOwner = await service.checkResource({ userId: 'user-1' }, 'track.edit', {
        ownerId: 'user-1',
      });
      const asStranger = await service.checkResource({ userId: 'user-1' }, 'track.edit', {
        ownerId: 'user-2',
      });

      expect(asOwner.allowed).toBe(true);
      expect(asStranger.allowed).toBe(false);
      expect(asStranger.code).toBe(AuthorizationDenyCode.SCOPE_DENIED);
    });
  });

  describe('explain', () => {
    it('expone el origen (plan) de cada capability efectiva', async () => {
      givePersonalPlan([capability('track.create')]);

      const explanation = await service.explain({ userId: 'user-1' });

      const grant = explanation.grants.find((entry) => entry.key === 'track.create');
      expect(grant?.origins[0]).toMatchObject({ type: 'PLAN', name: 'Autor Free' });
    });
  });
});
