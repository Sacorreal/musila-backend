import { BadRequestException, GoneException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { OrganizationInvite } from './entities/organization-invite.entity';
import { OrganizationInviteStatus } from './entities/organization-invite-status.enum';
import { OrganizationInviteService } from './organization-invite.service';

describe('OrganizationInviteService', () => {
  let service: OrganizationInviteService;
  let findOne: jest.Mock;

  const baseInvite = (): OrganizationInvite =>
    ({
      token: 'tok',
      email: 'admin@acme.com',
      organizationId: 'org-1',
      organization: { name: 'ACME' } as OrganizationInvite['organization'],
      roleKey: 'ORGANIZATION_ADMIN',
      status: OrganizationInviteStatus.PENDING,
      expiresAt: new Date(Date.now() + 60_000),
    }) as OrganizationInvite;

  beforeEach(async () => {
    findOne = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationInviteService,
        { provide: getRepositoryToken(OrganizationInvite), useValue: { findOne, create: jest.fn(), save: jest.fn() } },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
        { provide: EventBusService, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(OrganizationInviteService);
  });

  it('devuelve la vista pública cuando la invitación es válida', async () => {
    findOne.mockResolvedValue(baseInvite());

    const result = await service.validate('tok');

    expect(result).toEqual({
      token: 'tok',
      email: 'admin@acme.com',
      organizationId: 'org-1',
      organizationName: 'ACME',
      status: OrganizationInviteStatus.PENDING,
      expiresAt: expect.any(Date),
    });
  });

  it('lanza NotFound si no existe', async () => {
    findOne.mockResolvedValue(null);
    await expect(service.validate('tok')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lanza BadRequest si ya fue aceptada', async () => {
    findOne.mockResolvedValue({ ...baseInvite(), status: OrganizationInviteStatus.ACCEPTED });
    await expect(service.validate('tok')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lanza Gone si expiró', async () => {
    findOne.mockResolvedValue({ ...baseInvite(), expiresAt: new Date(Date.now() - 60_000) });
    await expect(service.validate('tok')).rejects.toBeInstanceOf(GoneException);
  });
});
