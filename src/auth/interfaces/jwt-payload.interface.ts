import { UserPlan } from 'src/users/entities/user-plan.enum';
import { UserRole } from 'src/users/entities/user-role.enum';

export interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  plan?: UserPlan;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;

}