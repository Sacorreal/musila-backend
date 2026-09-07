import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Organization } from 'src/organizations/entities/organization.entity';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { DataSource } from 'typeorm';
import { AuthorizationService } from './authorization.service';
import { CapabilityService } from './capability.service';
import { MembershipRole } from './entities/membership-role.entity';
import { Role } from './entities/role.entity';
import { RoleCapability } from './entities/role-capability.entity';
import { RoleSource } from './entities/role-source.enum';
import { RoleType } from './entities/role-type.enum';
import { RoleService } from './role.service';

const organization = {
  id: 'org-1',
  tenantId: 'tenant-1',
  type: 'PUBLISHER',
} as unknown as Organization;

describe('RoleService', () => {
  let service: RoleService;
  let roleRepo: { find: jest.Mock; findOne: jest.Mock; save: jest.Mock; remove: jest.Mock };
  let roleCapabilityRepo: { findOne: jest.Mock; save: jest.Mock; create: jest.Mock; delete: jest.Mock };
  let membershipRoleRepo: { find: jest.Mock; count: jest.Mock };
  let capabilityService: {
    findByIds: jest.Mock;
    getById: jest.Mock;
    assertCompatibleWithRole: jest.Mock;
  };
  let authorizationService: { getEffectiveCapabilityKeys: jest.Mock };
  let eventBus: { emit: jest.Mock };

  beforeEach(async () => {
    roleRepo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn(), remove: jest.fn() };
    roleCapabilityRepo = { findOne: jest.fn(), save: jest.fn(), create: jest.fn(), delete: jest.fn() };
    membershipRoleRepo = { find: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) };
    capabilityService = {
      findByIds: jest.fn(),
      getById: jest.fn(),
      assertCompatibleWithRole: jest.fn(),
    };
    authorizationService = { getEffectiveCapabilityKeys: jest.fn().mockResolvedValue([]) };
    eventBus = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        { provide: getRepositoryToken(Role), useValue: roleRepo },
        { provide: getRepositoryToken(RoleCapability), useValue: roleCapabilityRepo },
        { provide: getRepositoryToken(MembershipRole), useValue: membershipRoleRepo },
        { provide: CapabilityService, useValue: capabilityService },
        { provide: AuthorizationService, useValue: authorizationService },
        { provide: EventBusService, useValue: eventBus },
        {
          provide: DataSource,
          useValue: {
            // Ejecuta el callback como una transacción real, con un manager mock.
            transaction: jest.fn((cb) => cb({ delete: jest.fn(), save: jest.fn() })),
          },
        },
      ],
    }).compile();

    service = module.get(RoleService);
  });

  it('bloquea la edición de roles SYSTEM (regla §3)', async () => {
    roleRepo.findOne.mockResolvedValue({
      id: 'role-system',
      tenantId: 'tenant-musila',
      type: RoleType.ROSTER,
      source: RoleSource.SYSTEM,
      name: 'AUTOR',
      roleCapabilities: [],
    });

    await expect(
      service.updateRole(organization, 'role-system', { name: 'Hackeado' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('bloquea la eliminación de roles SYSTEM', async () => {
    roleRepo.findOne.mockResolvedValue({
      id: 'role-system',
      tenantId: 'tenant-musila',
      type: RoleType.ORGANIZATION,
      source: RoleSource.SYSTEM,
      name: 'Organization Admin',
      roleCapabilities: [],
    });

    await expect(service.deleteRole(organization, 'role-system')).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('impide eliminar un rol custom con memberships asignadas', async () => {
    roleRepo.findOne.mockResolvedValue({
      id: 'role-custom',
      tenantId: 'tenant-1',
      type: RoleType.ORGANIZATION,
      source: RoleSource.CUSTOM,
      name: 'A&R',
      roleCapabilities: [],
    });
    membershipRoleRepo.count.mockResolvedValue(2);

    await expect(service.deleteRole(organization, 'role-custom')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('previene el escalamiento de privilegios: no se otorga lo que no se posee (§14)', async () => {
    capabilityService.findByIds.mockResolvedValue([
      { id: 'cap-1', key: 'license.manage' },
    ]);
    capabilityService.assertCompatibleWithRole.mockReturnValue(undefined);
    // El actor solo posee roster.view en la organización y nada en plataforma.
    authorizationService.getEffectiveCapabilityKeys
      .mockResolvedValueOnce(['roster.view'])
      .mockResolvedValueOnce([]);

    await expect(
      service.createCustomRole(
        organization,
        {
          name: 'Legal',
          type: RoleType.ORGANIZATION,
          capabilityIds: ['cap-1'],
        },
        'actor-1',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rechaza roles de otro tenant al asignar membership roles (aislamiento)', async () => {
    roleRepo.find.mockResolvedValue([
      {
        id: 'role-ajeno',
        tenantId: 'tenant-otro',
        type: RoleType.ORGANIZATION,
        source: RoleSource.CUSTOM,
        name: 'Ajeno',
        roleCapabilities: [],
      },
    ]);

    await expect(
      service.setMembershipRoles(
        organization,
        'ORGANIZATION' as never,
        'membership-1',
        ['role-ajeno'],
        'actor-1',
        'user-2',
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
