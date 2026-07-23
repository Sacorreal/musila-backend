import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserPlanType } from 'src/users/entities/user-plan-type.enum';
import { ALLOWED_PLANS_KEY } from '../decorators/allowed-plans.decorator';

@Injectable()
export class PlansGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Obtener los planes definidos en el decorador @AllowedPlans()
    const requiredPlans = this.reflector.getAllAndOverride<UserPlanType[]>(ALLOWED_PLANS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si la ruta no tiene @AllowedPlans(), se permite el acceso por defecto
    if (!requiredPlans) {
      return true;
    }

    // 2. Obtener el usuario de la petición (inyectado previamente por JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // 3. Validar si el plan del usuario coincide con los permitidos
    const hasPlan = requiredPlans.includes(user.planType);

    if (!hasPlan) {
      throw new ForbiddenException(
        `Acceso denegado. Se requiere uno de los siguientes planes: ${requiredPlans.join(', ')}`
      );
    }

    return true;
  }
}
