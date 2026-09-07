import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UsersService } from '../users.service';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';

/**
 * Exige que el usuario autenticado tenga el email verificado.
 * Consulta la DB en cada request (no confía en el JWT, que puede quedar
 * desactualizado entre el registro y el momento en que el usuario verifica).
 * Se aplica solo a endpoints de creación de contenido (tracks, solicitudes,
 * playlists) — el resto de la app permanece accesible sin verificar, para no
 * friccionar el onboarding.
 *
 * Los Guest (invitados) usan una tabla y un flujo de creación distintos (vía
 * invitación de un usuario ya de confianza, `isVerified` por defecto `true`)
 * y nunca pasan por `/auth/register`, así que este guard no los afecta:
 * el JWT de un Guest nunca trae `plan`, a diferencia del de un User.
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user }: { user?: JwtPayload } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Los Guest no tienen `plan` en el JWT (ver AuthService.createToken) — no se les exige verificación.
    if (user.plan === undefined) {
      return true;
    }

    const currentUser = await this.usersService.findOneUserByIdService(user.id);

    if (!currentUser.isVerified) {
      throw new ForbiddenException('Debes verificar tu correo electrónico para continuar');
    }

    return true;
  }
}
