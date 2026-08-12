import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RoleService } from 'src/authorization/role.service';
import { PlanCapability } from 'src/entitlements/entities/plan-capability.entity';
import { Subscription } from 'src/entitlements/entities/subscription.entity';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { AccessRequestService } from './access-request.service';
import { AccessRequest } from './entities/access-request.entity';
import { AccessRequestStatus } from './entities/access-request-status.enum';
import { OrganizationsService } from './organizations.service';

describe('AccessRequestService', () => {
  let service: AccessRequestService;
  let accessRequestRepo: { findOne: jest.Mock; find: jest.Mock; save: jest.Mock };
  let subscriptionRepo: { findOne: jest.Mock };
  let planCapabilityRepo: { find: jest.Mock };
  let organizationsService: { findById: jest.Mock };
  let roleService: { getRoleForOrganization: jest.Mock; validateAndReplaceMembershipRoles: jest.Mock };
  let eventBus: { emit: jest.Mock };
  let transaction: jest.Mock;

  const pendingRequest = (): AccessRequest =>
    ({
      id: 'req-1',
      organizationId: 'org-1',
      userId: 'user-1',
      status: AccessRequestStatus.PENDING,
      user: { id: 'user-1', name: 'Ana', email: 'ana@acme.com' },
    }) as AccessRequest;

  const role = () => ({
    id: 'role-1',
    name: 'A&R',
    roleCapabilities: [
      { capability: { key: 'roster.view', name: 'Ver roster', description: 'Consulta el roster' } },
    ],
  });

  beforeEach(async () => {
    accessRequestRepo = {
      findOne: jest.fn().mockResolvedValue(pendingRequest()),
      find: jest.fn(),
      save: jest.fn((v) => v),
    };
    subscriptionRepo = { findOne: jest.fn().mockResolvedValue(null) };
    planCapabilityRepo = { find: jest.fn().mockResolvedValue([]) };
    organizationsService = { findById: jest.fn().mockResolvedValue({ id: 'org-1', name: 'ACME' }) };
    roleService = {
      getRoleForOrganization: jest.fn().mockResolvedValue(role()),
      validateAndReplaceMembershipRoles: jest.fn().mockResolvedValue(undefined),
    };
    eventBus = { emit: jest.fn() };
    transaction = jest.fn().mockImplementation((cb) =>
      cb({
        getRepository: () => ({
          findOne: jest.fn().mockResolvedValue(null),
          create: jest.fn((v) => v),
          save: jest.fn((v) => ({ ...v, id: 'membership-1' })),
        }),
        save: jest.fn((v) => v),
      }),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessRequestService,
        { provide: getRepositoryToken(AccessRequest), useValue: accessRequestRepo },
        { provide: getRepositoryToken(Subscription), useValue: subscriptionRepo },
        { provide: getRepositoryToken(PlanCapability), useValue: planCapabilityRepo },
        { provide: OrganizationsService, useValue: organizationsService },
        { provide: RoleService, useValue: roleService },
        { provide: EventBusService, useValue: eventBus },
        { provide: DataSource, useValue: { transaction } },
      ],
    }).compile();

    service = module.get(AccessRequestService);
  });

  it('aprueba: crea membership, asigna rol y emite el evento con el resumen de funciones', async () => {
    await service.approve('org-1', 'req-1', { membershipType: 'ORGANIZATION' as never, roleId: 'role-1' }, 'admin-1');

    expect(roleService.validateAndReplaceMembershipRoles).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: 'org-1' }),
      'ORGANIZATION',
      'membership-1',
      ['role-1'],
      'admin-1',
    );
    expect(eventBus.emit).toHaveBeenCalledWith('authorization.membership.updated', { userId: 'user-1' });
    expect(eventBus.emit).toHaveBeenCalledWith(
      'organization.access_request.approved',
      expect.objectContaining({
        userId: 'user-1',
        email: 'ana@acme.com',
        roleName: 'A&R',
        capabilities: [{ name: 'Ver roster', description: 'Consulta el roster' }],
      }),
    );
  });

  it('rechaza aprobar una solicitud ya resuelta', async () => {
    accessRequestRepo.findOne.mockResolvedValue({ ...pendingRequest(), status: AccessRequestStatus.APPROVED });
    await expect(
      service.approve('org-1', 'req-1', { membershipType: 'ORGANIZATION' as never, roleId: 'role-1' }, 'admin-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza: marca la solicitud como REJECTED y emite el evento', async () => {
    await service.reject('org-1', 'req-1', 'No reconocido', 'admin-1');

    expect(accessRequestRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: AccessRequestStatus.REJECTED, rejectionReason: 'No reconocido' }),
    );
    expect(eventBus.emit).toHaveBeenCalledWith(
      'organization.access_request.rejected',
      expect.objectContaining({ userId: 'user-1', organizationId: 'org-1' }),
    );
  });
});
