import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request)

    if (!token) {
      throw new UnauthorizedException('Necesitas un token de acceso');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token)
      request['user'] = payload;
      return true;

    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }


  }

  private extractTokenFromHeader(request: Request) {
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    return type === 'Bearer' ? token : undefined;
  }

}
