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
export class JWTAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    
    // Utilizamos la nueva función de extracción que soporta cookies
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Acceso denegado: No se encontró un token de autenticación');
    }

    try {
      // Si el token no es válido o ya expiró, verifyAsync lanzará un error que capturaremos abajo
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      
      // Adjuntamos el payload verificado al request para usarlo en los controladores (ej. @Req() req)
      request['user'] = payload;
      
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado. Por favor, inicia sesión nuevamente');
    }
  }

  /**
   * Extrae el token priorizando la cookie HttpOnly. 
   * Si no existe, intenta buscarlo en el header Authorization.
   */
  private extractToken(request: Request): string | undefined {
    // 1️⃣ INTENTO 1: Leer desde la cookie (Ideal para Next.js en la web)
   
    const tokenFromCookie = request.cookies?.['access_token'];
    
    if (tokenFromCookie) {
      return tokenFromCookie;
    }

    // 2️⃣ INTENTO 2: Fallback al Header de Autorización (Ideal para Postman o futuras Apps Móviles)
    const [type, tokenFromHeader] = request.headers.authorization?.split(' ') ?? [];
    
    return type === 'Bearer' ? tokenFromHeader : undefined;
  }
}