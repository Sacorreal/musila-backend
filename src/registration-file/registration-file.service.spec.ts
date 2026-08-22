import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { UserPlanType } from 'src/users/entities/user-plan-type.enum';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { EventBusService } from 'src/shared/events/event-bus.service';
import { StorageService } from 'src/shared/storage/storage.service';
import { Track } from 'src/tracks/entities/track.entity';
import { PublishingContract } from 'src/publishing-contracts/entities/publishing-contract.entity';
import { Split } from 'src/splits/entities/split.entity';
import { AuthorizationService } from 'src/authorization/authorization.service';
import { WorkSocietyAffiliationSnapshotService } from './services/work-society-affiliation-snapshot.service';

import { RegistrationFileService } from './registration-file.service';
import { RegistrationFile } from './entities/registration-file.entity';
import { RegistrationFileParticipant } from './entities/registration-file-participant.entity';
import { RegistrationFileStatus } from './entities/registration-file-status.enum';
import { RegistrationNumberService } from './registration-number.service';
import { ListRegistrationFilesDto } from './dto/list-registration-files.dto';

/** QueryBuilder encadenable que registra cada llamada y devuelve filas fijas. */
const makeQueryBuilder = (rows: unknown[], total: number) => {
  const qb: Record<string, jest.Mock> = {};
  ['leftJoinAndSelect', 'leftJoin', 'orderBy', 'skip', 'take', 'andWhere'].forEach((method) => {
    qb[method] = jest.fn(() => qb);
  });
  qb.getManyAndCount = jest.fn(async () => [rows, total]);
  return qb;
};

const makeRow = (overrides: Partial<RegistrationFile> = {}): RegistrationFile =>
  ({
    id: 'rf-1',
    caseNumber: 'EXP-MUS-2026-000001',
    title: 'Mi obra',
    status: RegistrationFileStatus.INCOMPLETO,
    activeProfileKeys: ['SAYCO'],
    updatedAt: new Date('2026-08-01T00:00:00Z'),
    completenessSnapshot: { overallPercentage: 42, calculatedAt: '2026-08-01' },
    track: { id: 'track-1' },
    createdBy: { name: 'Ana', lastName: 'García' },
    ...overrides,
  }) as unknown as RegistrationFile;

const adminUser: JwtPayload = { id: 'admin-1', email: 'a@a.com', planType: UserPlanType.ADMIN, name: 'Admin' };
const ownerUser: JwtPayload = { id: 'owner-1', email: 'o@o.com', planType: UserPlanType.PLAN_AUTOR, name: 'Owner' };

describe('RegistrationFileService.findAllForUser', () => {
  let service: RegistrationFileService;
  let registrationFileRepo: { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    registrationFileRepo = { createQueryBuilder: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationFileService,
        { provide: getRepositoryToken(RegistrationFile), useValue: registrationFileRepo },
        { provide: getRepositoryToken(RegistrationFileParticipant), useValue: {} },
        { provide: getRepositoryToken(Track), useValue: {} },
        { provide: getRepositoryToken(PublishingContract), useValue: {} },
        { provide: getRepositoryToken(Split), useValue: {} },
        { provide: DataSource, useValue: {} },
        { provide: RegistrationNumberService, useValue: {} },
        { provide: EventBusService, useValue: { emit: jest.fn() } },
        { provide: StorageService, useValue: {} },
        {
          provide: AuthorizationService,
          useValue: {
            getEffectiveCapabilityKeys: jest.fn(({ userId }: { userId: string }) =>
              Promise.resolve(userId === adminUser.id ? ['platform.content.tracks.view'] : []),
            ),
          },
        },
        { provide: WorkSocietyAffiliationSnapshotService, useValue: {} },
      ],
    }).compile();

    service = module.get(RegistrationFileService);
  });

  it('mapea las filas al envelope paginado con completitud y propietario', async () => {
    const qb = makeQueryBuilder([makeRow()], 1);
    registrationFileRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.findAllForUser(new ListRegistrationFilesDto(), ownerUser);

    expect(result).toEqual({
      data: [
        {
          id: 'rf-1',
          caseNumber: 'EXP-MUS-2026-000001',
          title: 'Mi obra',
          status: RegistrationFileStatus.INCOMPLETO,
          trackId: 'track-1',
          completenessPercentage: 42,
          activeProfileKeys: ['SAYCO'],
          updatedAt: new Date('2026-08-01T00:00:00Z'),
          ownerName: 'Ana García',
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
    });
  });

  it('el autor solo ve expedientes donde es autor del track', async () => {
    const qb = makeQueryBuilder([], 0);
    registrationFileRepo.createQueryBuilder.mockReturnValue(qb);

    await service.findAllForUser(new ListRegistrationFilesDto(), ownerUser);

    expect(qb.leftJoin).toHaveBeenCalledWith('track.authors', 'author');
    expect(qb.andWhere).toHaveBeenCalledWith('author.id = :userId', { userId: 'owner-1' });
  });

  it('el admin sin ownerId no filtra por propiedad', async () => {
    const qb = makeQueryBuilder([], 0);
    registrationFileRepo.createQueryBuilder.mockReturnValue(qb);

    await service.findAllForUser(new ListRegistrationFilesDto(), adminUser);

    expect(qb.leftJoin).not.toHaveBeenCalled();
    expect(qb.andWhere).not.toHaveBeenCalledWith('author.id = :userId', expect.anything());
  });

  it('el admin con ownerId filtra por ese propietario', async () => {
    const qb = makeQueryBuilder([], 0);
    registrationFileRepo.createQueryBuilder.mockReturnValue(qb);

    const query = Object.assign(new ListRegistrationFilesDto(), { ownerId: 'owner-9' });
    await service.findAllForUser(query, adminUser);

    expect(qb.leftJoin).toHaveBeenCalledWith('track.authors', 'author');
    expect(qb.andWhere).toHaveBeenCalledWith('author.id = :ownerId', { ownerId: 'owner-9' });
  });

  it('aplica búsqueda por número/título y filtro por estado', async () => {
    const qb = makeQueryBuilder([], 0);
    registrationFileRepo.createQueryBuilder.mockReturnValue(qb);

    const query = Object.assign(new ListRegistrationFilesDto(), {
      search: 'EXP-MUS',
      status: RegistrationFileStatus.LISTO_PARA_PRESENTAR,
    });
    await service.findAllForUser(query, adminUser);

    expect(qb.andWhere).toHaveBeenCalledWith(
      '(rf.caseNumber ILIKE :q OR rf.internalCode ILIKE :q OR rf.title ILIKE :q)',
      { q: '%EXP-MUS%' },
    );
    expect(qb.andWhere).toHaveBeenCalledWith('rf.status = :status', {
      status: RegistrationFileStatus.LISTO_PARA_PRESENTAR,
    });
  });

  it('calcula el offset de paginación a partir de page/limit', async () => {
    const qb = makeQueryBuilder([], 0);
    registrationFileRepo.createQueryBuilder.mockReturnValue(qb);

    const query = Object.assign(new ListRegistrationFilesDto(), { page: 3, limit: 20 });
    await service.findAllForUser(query, adminUser);

    expect(qb.skip).toHaveBeenCalledWith(40);
    expect(qb.take).toHaveBeenCalledWith(20);
  });
});
