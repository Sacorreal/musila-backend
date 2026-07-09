import { UserPlan } from 'src/users/entities/user-plan.enum';
import { UserRole } from 'src/users/entities/user-role.enum';

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  plan?: UserPlan;
  /**
   * Solo informativo para la UI (ej. mostrar un banner "verifica tu email").
   * Nunca se usa para autorizar: EmailVerifiedGuard siempre re-consulta la DB,
   * porque este valor queda desactualizado si el usuario verifica su correo
   * sin volver a iniciar sesión.
   */
  isVerified?: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;

}