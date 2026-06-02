import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PlaylistCollaborator } from 'src/playlist-collaborators/entities/playlist-collaborator.entity';
import { Playlist } from 'src/playlists/entities/playlist.entity';
import { RequestedTrack } from 'src/requested-tracks/entities/requested-track.entity';
import { Track } from 'src/tracks/entities/track.entity';
import { UserPlan } from 'src/users/entities/user-plan.enum';
import { UserRole } from 'src/users/entities/user-role.enum';
import { User } from 'src/users/entities/user.entity';
import { PLAN_LIMIT_KEY } from '../plan-limits/plan-limit.decorator';
import { PlanLimitsGuard } from './plan-limits.guard';

const makeMockRepo = (overrides: Record<string, jest.Mock> = {}) => ({
  findOne: jest.fn().mockResolvedValue(null),
  count: jest.fn().mockResolvedValue(0),
  find: jest.fn().mockResolvedValue([]),
  createQueryBuilder: jest.fn().mockReturnValue({
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
  }),
  ...overrides,
});

function buildContext(userId: string, resource: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user: { id: userId, role: undefined } }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('PlanLimitsGuard', () => {
  let guard: PlanLimitsGuard;
  let reflector: Reflector;
  let userRepo: ReturnType<typeof makeMockRepo>;
  let trackRepo: ReturnType<typeof makeMockRepo>;
  let requestRepo: ReturnType<typeof makeMockRepo>;
  let playlistRepo: ReturnType<typeof makeMockRepo>;
  let collaboratorRepo: ReturnType<typeof makeMockRepo>;

  beforeEach(async () => {
    userRepo = makeMockRepo();
    trackRepo = makeMockRepo();
    requestRepo = makeMockRepo();
    playlistRepo = makeMockRepo();
    collaboratorRepo = makeMockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanLimitsGuard,
        Reflector,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Track), useValue: trackRepo },
        { provide: getRepositoryToken(RequestedTrack), useValue: requestRepo },
        { provide: getRepositoryToken(Playlist), useValue: playlistRepo },
        { provide: getRepositoryToken(PlaylistCollaborator), useValue: collaboratorRepo },
      ],
    }).compile();

    guard = module.get<PlanLimitsGuard>(PlanLimitsGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  function setupReflector(resource: string | undefined) {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(resource);
  }

  function setupUser(role: UserRole, plan: UserPlan) {
    userRepo.findOne.mockResolvedValue({ id: 'user-1', role, plan });
  }

  // ─── Sin metadato de recurso ─────────────────────────────────────────────────

  it('debe permitir si no hay metadato de recurso', async () => {
    setupReflector(undefined);
    const ctx = buildContext('user-1', undefined);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  // ─── Autor Free — tracks ─────────────────────────────────────────────────────

  it('debe bloquear al Autor Free que ya tiene 3 tracks', async () => {
    setupReflector('tracks');
    setupUser(UserRole.AUTOR, UserPlan.FREE);
    trackRepo.createQueryBuilder.mockReturnValue({
      innerJoin: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(3),
    });

    const ctx = buildContext('user-1', 'tracks');
    await expect(guard.canActivate(ctx)).rejects.toThrow(HttpException);
  });

  it('debe permitir al Autor Free con menos de 3 tracks', async () => {
    setupReflector('tracks');
    setupUser(UserRole.AUTOR, UserPlan.FREE);
    trackRepo.createQueryBuilder.mockReturnValue({
      innerJoin: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(2),
    });

    const ctx = buildContext('user-1', 'tracks');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('debe permitir al Autor Pro publicar sin límite de tracks', async () => {
    setupReflector('tracks');
    setupUser(UserRole.AUTOR, UserPlan.PRO);
    trackRepo.createQueryBuilder.mockReturnValue({
      innerJoin: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(100),
    });

    const ctx = buildContext('user-1', 'tracks');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  // ─── Cantautor Free — requests ───────────────────────────────────────────────

  it('debe bloquear al Cantautor Free con 3 solicitudes activas', async () => {
    setupReflector('requests');
    setupUser(UserRole.CANTAUTOR, UserPlan.FREE);
    requestRepo.count.mockResolvedValue(3);

    const ctx = buildContext('user-1', 'requests');
    await expect(guard.canActivate(ctx)).rejects.toThrow(HttpException);
  });

  it('debe permitir al Cantautor Pro enviar solicitudes sin límite', async () => {
    setupReflector('requests');
    setupUser(UserRole.CANTAUTOR, UserPlan.PRO);
    requestRepo.count.mockResolvedValue(50);

    const ctx = buildContext('user-1', 'requests');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  // ─── Intérprete Free — playlists ────────────────────────────────────────────

  it('debe bloquear al Intérprete Free con 1 playlist', async () => {
    setupReflector('playlists');
    setupUser(UserRole.INTERPRETE, UserPlan.FREE);
    playlistRepo.count.mockResolvedValue(1);

    const ctx = buildContext('user-1', 'playlists');
    await expect(guard.canActivate(ctx)).rejects.toThrow(HttpException);
  });

  it('debe permitir al Intérprete Pro playlists ilimitadas', async () => {
    setupReflector('playlists');
    setupUser(UserRole.INTERPRETE, UserPlan.PRO);
    playlistRepo.count.mockResolvedValue(99);

    const ctx = buildContext('user-1', 'playlists');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  // ─── Colaboradores ───────────────────────────────────────────────────────────

  it('debe bloquear al Cantautor Free con 2 colaboradores', async () => {
    setupReflector('collaborators');
    setupUser(UserRole.CANTAUTOR, UserPlan.FREE);
    playlistRepo.find.mockResolvedValue([{ id: 'pl-1' }]);
    collaboratorRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(2),
    });

    const ctx = buildContext('user-1', 'collaborators');
    await expect(guard.canActivate(ctx)).rejects.toThrow(HttpException);
  });

  it('debe bloquear al Cantautor Pro con más de 5 colaboradores', async () => {
    setupReflector('collaborators');
    setupUser(UserRole.CANTAUTOR, UserPlan.PRO);
    playlistRepo.find.mockResolvedValue([{ id: 'pl-1' }]);
    collaboratorRepo.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(5),
    });

    const ctx = buildContext('user-1', 'collaborators');
    await expect(guard.canActivate(ctx)).rejects.toThrow(HttpException);
  });

  // ─── Respuesta 402 con payload correcto ─────────────────────────────────────

  it('debe retornar HTTP 402 con PLAN_LIMIT_REACHED en el body', async () => {
    setupReflector('tracks');
    setupUser(UserRole.AUTOR, UserPlan.FREE);
    trackRepo.createQueryBuilder.mockReturnValue({
      innerJoin: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(3),
    });

    const ctx = buildContext('user-1', 'tracks');

    try {
      await guard.canActivate(ctx);
      fail('Debería haber lanzado HttpException');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      const response = (e as HttpException).getResponse() as Record<string, unknown>;
      expect(response.error).toBe('PLAN_LIMIT_REACHED');
      expect(response.resource).toBe('tracks');
      expect(response.limit).toBe(3);
      expect(response.upgradeRequired).toBe('pro');
      expect((e as HttpException).getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED);
    }
  });
});
