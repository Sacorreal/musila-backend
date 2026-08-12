import { BadRequestException, GoneException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { Organization } from './entities/organization.entity';
import { WorkspaceInviteLink } from './entities/workspace-invite-link.entity';
import { WorkspaceInviteLinkStatus } from './entities/workspace-invite-link-status.enum';
import { WorkspaceInviteService } from './workspace-invite.service';

describe('WorkspaceInviteService', () => {
  let service: WorkspaceInviteService;
  let linkRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let orgRepo: { findOne: jest.Mock };
  let eventBus: { emit: jest.Mock };
  let transaction: jest.Mock;

  const activeLink = (overrides: Partial<WorkspaceInviteLink> = {}): WorkspaceInviteLink =>
    ({
      id: 'link-1',
      organizationId: 'org-1',
      token: 'tok',
      status: WorkspaceInviteLinkStatus.ACTIVE,
      useCount: 0,
      maxUses: null,
      expiresAt: new Date(Date.now() + 60_000),
      ...overrides,
    }) as WorkspaceInviteLink;

  beforeEach(async () => {
    linkRepo = { findOne: jest.fn(), create: jest.fn((v) => v), save: jest.fn((v) => v) };
    orgRepo = { findOne: jest.fn().mockResolvedValue({ name: 'ACME' } as Organization) };
    eventBus = { emit: jest.fn() };
    transaction = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceInviteService,
        { provide: getRepositoryToken(WorkspaceInviteLink), useValue: linkRepo },
        { provide: getRepositoryToken(Organization), useValue: orgRepo },
        { provide: EventBusService, useValue: eventBus },
        { provide: DataSource, useValue: { transaction } },
      ],
    }).compile();

    service = module.get(WorkspaceInviteService);
  });

  it('valida un enlace activo y devuelve los datos de la organización', async () => {
    linkRepo.findOne.mockResolvedValue(activeLink());
    const result = await service.validatePublic('tok');
    expect(result).toEqual({ organizationId: 'org-1', organizationName: 'ACME', token: 'tok' });
  });

  it('lanza NotFound si el enlace no existe', async () => {
    linkRepo.findOne.mockResolvedValue(null);
    await expect(service.validatePublic('tok')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lanza BadRequest si el enlace fue revocado', async () => {
    linkRepo.findOne.mockResolvedValue(activeLink({ status: WorkspaceInviteLinkStatus.REVOKED }));
    await expect(service.validatePublic('tok')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lanza Gone si el enlace expiró', async () => {
    linkRepo.findOne.mockResolvedValue(activeLink({ expiresAt: new Date(Date.now() - 60_000) }));
    await expect(service.validatePublic('tok')).rejects.toBeInstanceOf(GoneException);
  });

  it('lanza Gone si el enlace alcanzó su máximo de usos', async () => {
    linkRepo.findOne.mockResolvedValue(activeLink({ maxUses: 1, useCount: 1 }));
    await expect(service.validatePublic('tok')).rejects.toBeInstanceOf(GoneException);
  });

  it('crea el enlace cuando no hay uno activo', async () => {
    linkRepo.findOne.mockResolvedValue(null);
    const created = await service.getOrCreateActiveLink('org-1', 'admin-1');
    expect(linkRepo.save).toHaveBeenCalled();
    expect(created.status).toBe(WorkspaceInviteLinkStatus.ACTIVE);
    expect(created.organizationId).toBe('org-1');
  });

  it('consume el enlace: incrementa usos, crea la solicitud y emite el evento', async () => {
    const link = activeLink();
    const manager = {
      findOne: jest.fn().mockResolvedValue(link),
      save: jest.fn((v) => v),
      create: jest.fn((_entity, v) => v),
    };
    transaction.mockImplementation((cb) => cb(manager));

    const request = await service.consumeForNewUser('tok', 'user-1');

    expect(link.useCount).toBe(1);
    expect(request.userId).toBe('user-1');
    expect(request.organizationId).toBe('org-1');
    expect(eventBus.emit).toHaveBeenCalledWith(
      'organization.access_request.created',
      expect.objectContaining({ organizationId: 'org-1', requesterUserId: 'user-1' }),
    );
  });
});
