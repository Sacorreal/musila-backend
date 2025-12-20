import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { UserRole } from "src/users/entities/user-role.enum";
import { ROLES_KEY } from "../decorators/roles.decorator";



@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ])

        if (!requiredRoles) return true;

        const request = context.switchToHttp().getRequest();
        const user = request.user

        if (!user || !requiredRoles.includes(user.role)) {
            throw new ForbiddenException('No tienes permiso para realizar esta accion');
        }

        return true;
    }
}