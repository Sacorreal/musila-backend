import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { UserPlanType } from 'src/users/entities/user-plan-type.enum';
import { PlansGuard } from './plans.guard';

function buildContext(user: { planType?: UserPlanType } | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('PlansGuard', () => {
  let guard: PlansGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlansGuard, Reflector],
    }).compile();

    guard = module.get<PlansGuard>(PlansGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  function setupRequiredPlans(plans: UserPlanType[] | undefined) {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(plans);
  }

  it('permite el acceso si la ruta no tiene @AllowedPlans()', () => {
    setupRequiredPlans(undefined);
    const ctx = buildContext({ planType: UserPlanType.INVITADO });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('permite el acceso si el plan del usuario está entre los permitidos', () => {
    setupRequiredPlans([UserPlanType.ADMIN, UserPlanType.PLAN_360]);
    const ctx = buildContext({ planType: UserPlanType.PLAN_360 });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('lanza ForbiddenException si el plan del usuario no está permitido', () => {
    setupRequiredPlans([UserPlanType.ADMIN]);
    const ctx = buildContext({ planType: UserPlanType.PLAN_AUTOR });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('lanza ForbiddenException si no hay usuario autenticado', () => {
    setupRequiredPlans([UserPlanType.ADMIN]);
    const ctx = buildContext(undefined);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
