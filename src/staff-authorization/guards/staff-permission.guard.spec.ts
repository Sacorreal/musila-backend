import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { UserPlanType } from 'src/users/entities/user-plan-type.enum';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { StaffPermissionGuard } from './staff-permission.guard';
import { StaffAuthorizationService } from '../staff-authorization.service';

function buildContext(user: Partial<JwtPayload> | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('StaffPermissionGuard', () => {
  let guard: StaffPermissionGuard;
  let reflector: Reflector;
  let staffAuthorizationService: { hasPermission: jest.Mock };

  beforeEach(async () => {
    staffAuthorizationService = { hasPermission: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffPermissionGuard,
        Reflector,
        { provide: StaffAuthorizationService, useValue: staffAuthorizationService },
      ],
    }).compile();

    guard = module.get(StaffPermissionGuard);
    reflector = module.get(Reflector);
  });

  function setupRequiredCodes(codes: string[] | undefined) {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(codes);
  }

  it('permite el acceso si la ruta no tiene @RequireStaffPermission()', async () => {
    setupRequiredCodes(undefined);
    const ctx = buildContext({ id: 'u1', planType: UserPlanType.PLAN_AUTOR });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(staffAuthorizationService.hasPermission).not.toHaveBeenCalled();
  });

  it('permite el acceso total a un Super Admin sin consultar permisos', async () => {
    setupRequiredCodes(['blog:articles:publish']);
    const ctx = buildContext({ id: 'u1', planType: UserPlanType.SUPERADMIN });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(staffAuthorizationService.hasPermission).not.toHaveBeenCalled();
  });

  it('permite el acceso si el usuario tiene el permiso requerido', async () => {
    setupRequiredCodes(['blog:articles:publish']);
    staffAuthorizationService.hasPermission.mockResolvedValue(true);
    const ctx = buildContext({ id: 'u1', planType: UserPlanType.ADMIN });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(staffAuthorizationService.hasPermission).toHaveBeenCalledWith('u1', ['blog:articles:publish']);
  });

  it('lanza ForbiddenException si el usuario no tiene el permiso requerido', async () => {
    setupRequiredCodes(['system:roles:manage']);
    staffAuthorizationService.hasPermission.mockResolvedValue(false);
    const ctx = buildContext({ id: 'u1', planType: UserPlanType.ADMIN });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('lanza ForbiddenException si no hay usuario autenticado', async () => {
    setupRequiredCodes(['system:roles:manage']);
    const ctx = buildContext(undefined);
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});
