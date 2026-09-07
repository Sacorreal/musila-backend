import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrganizationType } from 'src/organizations/entities/organization-type.enum';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { CapabilityService } from './capability.service';
import { Capability } from './entities/capability.entity';
import { CapabilitySubject } from './entities/capability-subject.enum';

const capability = (key: string, overrides: Partial<Capability> = {}): Capability =>
  ({
    id: `cap-${key}`,
    key,
    name: key,
    description: key,
    domain: 'TEST',
    resource: 'test',
    isActive: true,
    assignableTo: [],
    allowedScopes: [],
    organizationTypes: [],
    version: 1,
    ...overrides,
  }) as Capability;

describe('CapabilityService', () => {
  let service: CapabilityService;
  let repo: { find: jest.Mock; findOne: jest.Mock; save: jest.Mock };
  let eventBus: { emit: jest.Mock };

  beforeEach(async () => {
    repo = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn(), save: jest.fn() };
    eventBus = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CapabilityService,
        { provide: getRepositoryToken(Capability), useValue: repo },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    service = module.get(CapabilityService);
  });

  describe('assertCompatibleWithRole (validación real en backend, §20)', () => {
    it('rechaza con CAPABILITY_NOT_AVAILABLE_FOR_ORGANIZATION_TYPE un tipo incompatible', () => {
      const incompatible = capability('analytics.advanced.view', {
        assignableTo: [CapabilitySubject.ORGANIZATION_MEMBER],
        organizationTypes: [OrganizationType.LABEL],
      });

      expect(() =>
        service.assertCompatibleWithRole(
          [incompatible],
          CapabilitySubject.ORGANIZATION_MEMBER,
          OrganizationType.PUBLISHER,
        ),
      ).toThrow(BadRequestException);

      try {
        service.assertCompatibleWithRole(
          [incompatible],
          CapabilitySubject.ORGANIZATION_MEMBER,
          OrganizationType.PUBLISHER,
        );
      } catch (error) {
        expect((error as BadRequestException).getResponse()).toMatchObject({
          code: 'CAPABILITY_NOT_AVAILABLE_FOR_ORGANIZATION_TYPE',
          capability: 'analytics.advanced.view',
        });
      }
    });

    it('rechaza una capability no asignable al tipo de sujeto del rol', () => {
      const platformOnly = capability('platform.users.manage', {
        assignableTo: [CapabilitySubject.PLATFORM_MEMBER],
      });

      expect(() =>
        service.assertCompatibleWithRole([platformOnly], CapabilitySubject.ORGANIZATION_MEMBER),
      ).toThrow(BadRequestException);
    });

    it('rechaza capabilities inactivas', () => {
      const inactive = capability('campaign.create', { isActive: false });
      expect(() =>
        service.assertCompatibleWithRole([inactive], CapabilitySubject.ORGANIZATION_MEMBER),
      ).toThrow(BadRequestException);
    });

    it('acepta una capability compatible (organizationTypes vacío = todos los tipos)', () => {
      const open = capability('roster.view', {
        assignableTo: [CapabilitySubject.ORGANIZATION_MEMBER],
      });
      expect(() =>
        service.assertCompatibleWithRole(
          [open],
          CapabilitySubject.ORGANIZATION_MEMBER,
          OrganizationType.AGENCY,
        ),
      ).not.toThrow();
    });
  });

  it('findCatalog filtra por dominio, sujeto y tipo de organización', async () => {
    repo.find.mockResolvedValue([
      capability('roster.view', {
        domain: 'ROSTER',
        assignableTo: [CapabilitySubject.ORGANIZATION_MEMBER],
      }),
      capability('reports.view', {
        domain: 'REPORTS',
        assignableTo: [CapabilitySubject.ORGANIZATION_MEMBER],
        organizationTypes: [OrganizationType.LABEL],
      }),
      capability('inactive.cap', { domain: 'ROSTER', isActive: false }),
    ]);

    const catalog = await service.findCatalog({
      assignableTo: CapabilitySubject.ORGANIZATION_MEMBER,
      organizationType: OrganizationType.PUBLISHER,
    });

    expect(catalog.map((entry) => entry.key)).toEqual(['roster.view']);
  });
});
