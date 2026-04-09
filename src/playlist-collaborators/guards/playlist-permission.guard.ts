import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { JwtPayload } from 'src/auth/interfaces/jwt-payload.interface';
import { UserRole } from 'src/users/entities/user-role.enum';
import { CollaboratorPermission } from '../entities/collaborator-permission.enum';
import { PLAYLIST_PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { PlaylistCollaboratorsService } from '../playlist-collaborators.service';

interface PlaylistRequest {
  user: JwtPayload;
  params: { id?: string; playlistId?: string };
}

@Injectable()
export class PlaylistPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly collaboratorsService: PlaylistCollaboratorsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<CollaboratorPermission>(
      PLAYLIST_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si la ruta no exige permisos especiales, se asume pública (dentro de lo autenticado).
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest<PlaylistRequest>();
    const user: JwtPayload = request.user;

    // Asumimos que el identificador de la playlist viene como "id" o "playlistId"
    const playlistId = request.params.playlistId ?? request.params.id;

    if (!user) {
      throw new ForbiddenException(
        'Usuario no autenticado (asegúrate de usar JWTAuthGuard previamente)',
      );
    }

    if (!playlistId) {
      throw new NotFoundException('ID de la playlist no especificado en la ruta');
    }

    // 1. ADMIN de sistema tiene acceso total
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // 2. Verificar si la playlist existe y el usuario es el dueño
    const playlist = await this.collaboratorsService.findPlaylistWithOwner(playlistId);

    if (playlist.owner.id === user.id) {
      return true; // El dueño siempre tiene acceso total
    }

    // 3. Si no es el dueño, buscar su permiso como colaborador
    const userPermission = await this.collaboratorsService.getCollaboratorPermission(
      playlistId,
      user.id,
    );

    if (!userPermission) {
      throw new ForbiddenException('No eres dueño ni colaborador de esta playlist');
    }

    // 4. Validar jerarquía de permisos de colaboración: ADMIN > WRITE > READ
    if (!this.hasSufficientPermission(userPermission, requiredPermission)) {
      throw new ForbiddenException(
        `Se requiere permiso de nivel '${requiredPermission}' para esta acción, pero posees nivel '${userPermission}'.`,
      );
    }

    return true;
  }

  /**
   * Evalúa si el permiso que tiene el usuario alcanza el mínimo requerido.
   */
  private hasSufficientPermission(
    userPerm: CollaboratorPermission,
    requiredPerm: CollaboratorPermission,
  ): boolean {
    const levels: Record<CollaboratorPermission, number> = {
      [CollaboratorPermission.READ]: 1,
      [CollaboratorPermission.WRITE]: 2,
      [CollaboratorPermission.ADMIN]: 3,
    };

    return levels[userPerm] >= levels[requiredPerm];
  }
}
