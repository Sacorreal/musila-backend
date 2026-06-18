import { UserPlan } from 'src/users/entities/user-plan.enum';
import { UserRole } from 'src/users/entities/user-role.enum';

export type PlanResource = 'tracks' | 'requests' | 'collaborators' | 'playlists';

/** null = ilimitado */
type LimitMap = Partial<Record<PlanResource, number | null>>;

export const PLAN_LIMITS: Partial<Record<UserRole, Record<UserPlan, LimitMap>>> = {
  [UserRole.AUTOR]: {
    [UserPlan.FREE]: { tracks: 5 },
    [UserPlan.PRO]: { tracks: null },
  },
  [UserRole.CANTAUTOR]: {
    [UserPlan.FREE]: { tracks: 5, requests: 3, collaborators: 2, playlists: 1 },
    [UserPlan.PRO]: { tracks: null, requests: null, collaborators: 5, playlists: null },
  },
  [UserRole.INTERPRETE]: {
    [UserPlan.FREE]: { requests: 5, collaborators: 2, playlists: 1 },
    [UserPlan.PRO]: { requests: null, collaborators: 5, playlists: null },
  },
};

export function getLimit(role: UserRole, plan: UserPlan, resource: PlanResource): number | null | undefined {
  return PLAN_LIMITS[role]?.[plan]?.[resource];
}
