import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UserPlan } from 'src/users/entities/user-plan.enum';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import {
  PLAN_LIMIT_KEY,
  PlanResource,
} from '../plan-limits/plan-limit.decorator';
import { getLimit } from '../plan-limits/plan-limits.config';
import { PlanLimitsService } from '../plan-limits/plan-limits.service';

@Injectable()
export class PlanLimitsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly planLimitsService: PlanLimitsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resource = this.reflector.getAllAndOverride<PlanResource>(PLAN_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!resource) return true;

    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const jwtUser = request.user;
    if (!jwtUser) return true;

    const user = await this.userRepo.findOne({ where: { id: jwtUser.id } });
    if (!user) return true;

    const plan = user.plan ?? UserPlan.FREE;
    const limit = getLimit(user.planType, plan, resource);

    if (limit === undefined || limit === null) return true;

    const count = await this.planLimitsService.countResource(resource, jwtUser.id);

    if (count >= limit) {
      throw new HttpException(
        {
          error: 'PLAN_LIMIT_REACHED',
          resource,
          limit,
          current: count,
          upgradeRequired: 'pro',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }
}
