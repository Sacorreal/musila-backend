import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from 'src/users/entities/user-role.enum';

@Injectable()
export class JwtAuthRolesGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Autenticación JWT
    const request: Request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Necesitas un token de acceso');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      request['user'] = payload;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    // 2. Verificación de roles (si están especificados)
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si no hay roles requeridos, solo se necesita autenticación
    if (!requiredRoles) {
      return true;
    }

    // Si hay roles requeridos, verificar que el usuario tenga uno de ellos
    const user = request['user'] as JwtPayload;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('No tienes permiso para realizar esta accion');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

