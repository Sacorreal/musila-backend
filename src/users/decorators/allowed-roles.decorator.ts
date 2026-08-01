import { SetMetadata } from '@nestjs/common';
import { MusicRole } from '../entities/music-role.enum';

export const ALLOWED_ROLES_KEY = 'allowedRoles';
export const AllowedRoles = (...roles: MusicRole[]) => SetMetadata(ALLOWED_ROLES_KEY, roles);
