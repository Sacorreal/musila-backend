import { UserPlan } from 'src/users/entities/user-plan.enum';
import { UserPlanType } from 'src/users/entities/user-plan-type.enum';

export interface JwtPayload {
  id: string;
  email: string;
  planType: UserPlanType;
  name: string;
  plan?: UserPlan;
  /**
   * Solo informativo para la UI (ej. mostrar un banner "verifica tu email").
   * Nunca se usa para autorizar: EmailVerifiedGuard siempre re-consulta la DB,
   * porque este valor queda desactualizado si el usuario verifica su correo
   * sin volver a iniciar sesión.
   */
  isVerified?: boolean;
  /**
   * Solo informativo para la UI (ej. decidir si mostrar el modal de identidad
   * legal antes de reproducir un track ajeno). Nunca se usa para autorizar:
   * `LegalIdentityGuard`/`TrackLegalIdentityGuard` siempre re-consultan la DB.
   */
  identidadLegalVerificada?: boolean;
  username?: string;
  /**
   * Solo informativo para la UI (ej. mostrar el modal bloqueante para elegir
   * un username definitivo). Nunca se usa para autorizar: el endpoint de
   * actualización de perfil siempre revalida en DB.
   */
  usernameIsTemporary?: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;

}