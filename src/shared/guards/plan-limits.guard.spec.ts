import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { UserPlan } from 'src/users/entities/user-plan.enum';
import { UserRole } from 'src/users/entities/user-role.enum';
import { getLimit } from '../plan-limits/plan-limits.config';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';
import { PlanLimitsGuard } from './plan-limits.guard';

const makeMockUserRepo = () => ({
  findOne: jest.fn().mockResolvedValue(null),
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
  let userRepo: ReturnType<typeof makeMockUserRepo>;
  let planLimitsService: { countResource: jest.Mock };

  beforeEach(async () => {
    userRepo = makeMockUserRepo();
    planLimitsService = { countResource: jest.fn().mockResolvedValue(0) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanLimitsGuard,
        Reflector,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: PlanLimitsService, useValue: planLimitsService },
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

  it('debe bloquear al Autor Free que ya alcanzó el límite de tracks', async () => {
    const limit = getLimit(UserRole.AUTOR, UserPlan.FREE, 'tracks') as number;
    setupReflector('tracks');
    setupUser(UserRole.AUTOR, UserPlan.FREE);
    planLimitsService.countResource.mockResolvedValue(limit);

    const ctx = buildContext('user-1', 'tracks');
    await expect(guard.canActivate(ctx)).rejects.toThrow(HttpException);
  });

  it('debe permitir al Autor Free con menos tracks que el límite', async () => {
    const limit = getLimit(UserRole.AUTOR, UserPlan.FREE, 'tracks') as number;
    setupReflector('tracks');
    setupUser(UserRole.AUTOR, UserPlan.FREE);
    planLimitsService.countResource.mockResolvedValue(limit - 1);

    const ctx = buildContext('user-1', 'tracks');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('debe permitir al Autor Pro publicar sin límite de tracks', async () => {
    setupReflector('tracks');
    setupUser(UserRole.AUTOR, UserPlan.PRO);
    planLimitsService.countResource.mockResolvedValue(100);

    const ctx = buildContext('user-1', 'tracks');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  // ─── Cantautor Free — requests ───────────────────────────────────────────────

  it('debe bloquear al Cantautor Free que ya alcanzó el límite de solicitudes', async () => {
    const limit = getLimit(UserRole.CANTAUTOR, UserPlan.FREE, 'requests') as number;
    setupReflector('requests');
    setupUser(UserRole.CANTAUTOR, UserPlan.FREE);
    planLimitsService.countResource.mockResolvedValue(limit);

    const ctx = buildContext('user-1', 'requests');
    await expect(guard.canActivate(ctx)).rejects.toThrow(HttpException);
  });

  it('debe permitir al Cantautor Pro enviar solicitudes sin límite', async () => {
    setupReflector('requests');
    setupUser(UserRole.CANTAUTOR, UserPlan.PRO);
    planLimitsService.countResource.mockResolvedValue(50);

    const ctx = buildContext('user-1', 'requests');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  // ─── Intérprete Free — playlists ────────────────────────────────────────────

  it('debe bloquear al Intérprete Free que ya alcanzó el límite de playlists', async () => {
    const limit = getLimit(UserRole.INTERPRETE, UserPlan.FREE, 'playlists') as number;
    setupReflector('playlists');
    setupUser(UserRole.INTERPRETE, UserPlan.FREE);
    planLimitsService.countResource.mockResolvedValue(limit);

    const ctx = buildContext('user-1', 'playlists');
    await expect(guard.canActivate(ctx)).rejects.toThrow(HttpException);
  });

  it('debe permitir al Intérprete Pro playlists ilimitadas', async () => {
    setupReflector('playlists');
    setupUser(UserRole.INTERPRETE, UserPlan.PRO);
    planLimitsService.countResource.mockResolvedValue(99);

    const ctx = buildContext('user-1', 'playlists');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  // ─── Colaboradores ───────────────────────────────────────────────────────────

  it('debe bloquear al Cantautor Free que ya alcanzó el límite de colaboradores', async () => {
    const limit = getLimit(UserRole.CANTAUTOR, UserPlan.FREE, 'collaborators') as number;
    setupReflector('collaborators');
    setupUser(UserRole.CANTAUTOR, UserPlan.FREE);
    planLimitsService.countResource.mockResolvedValue(limit);

    const ctx = buildContext('user-1', 'collaborators');
    await expect(guard.canActivate(ctx)).rejects.toThrow(HttpException);
  });

  it('debe bloquear al Cantautor Pro que ya alcanzó el límite de colaboradores', async () => {
    const limit = getLimit(UserRole.CANTAUTOR, UserPlan.PRO, 'collaborators') as number;
    setupReflector('collaborators');
    setupUser(UserRole.CANTAUTOR, UserPlan.PRO);
    planLimitsService.countResource.mockResolvedValue(limit);

    const ctx = buildContext('user-1', 'collaborators');
    await expect(guard.canActivate(ctx)).rejects.toThrow(HttpException);
  });

  // ─── Respuesta 402 con payload correcto ─────────────────────────────────────

  it('debe retornar HTTP 402 con PLAN_LIMIT_REACHED en el body', async () => {
    const limit = getLimit(UserRole.AUTOR, UserPlan.FREE, 'tracks') as number;
    setupReflector('tracks');
    setupUser(UserRole.AUTOR, UserPlan.FREE);
    planLimitsService.countResource.mockResolvedValue(limit);

    const ctx = buildContext('user-1', 'tracks');

    try {
      await guard.canActivate(ctx);
      fail('Debería haber lanzado HttpException');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      const response = (e as HttpException).getResponse() as Record<string, unknown>;
      expect(response.error).toBe('PLAN_LIMIT_REACHED');
      expect(response.resource).toBe('tracks');
      expect(response.limit).toBe(limit);
      expect(response.upgradeRequired).toBe('pro');
      expect((e as HttpException).getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED);
    }
  });
});
