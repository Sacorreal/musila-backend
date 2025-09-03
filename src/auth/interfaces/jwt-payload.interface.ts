import { UserRole } from 'src/users/entities/user-role.enum';

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
