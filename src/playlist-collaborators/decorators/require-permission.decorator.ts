import { SetMetadata } from '@nestjs/common';
import { CollaboratorPermission } from '../entities/collaborator-permission.enum';

export const PLAYLIST_PERMISSION_KEY = 'playlist_permission';

/**
 * Define el nivel MÍNIMO de permiso requerido como colaborador para acceder a una ruta de Playlist.
 * Jerarquía de permisos: ADMIN > WRITE > READ.
 * 
 * - Si eres el OWNER de la playlist: Siempre tendrás acceso.
 * - Si eres ADMIN global del sistema: Siempre tendrás acceso.
 */
export const RequirePlaylistPermission = (permission: CollaboratorPermission) =>
  SetMetadata(PLAYLIST_PERMISSION_KEY, permission);
